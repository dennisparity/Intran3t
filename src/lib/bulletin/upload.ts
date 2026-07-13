import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { createClient } from "polkadot-api";
import { Binary } from "@polkadot-api/substrate-bindings";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getWsProvider } from "polkadot-api/ws";
import { createPapiProvider } from "@novasamatech/host-api-wrapper";
import { isInHost } from "../wallet-provider";
import { calculateCID } from "./cid";

// Genesis hash for the Paseo Next v2 Bulletin chain — required so Triangle host
// routes this PAPI client to the correct chain instead of falling back to Asset Hub.
const BULLETIN_GENESIS = "0x8cfe6717dc4becfda2e13c488a1e2061ff2dfee96e7d031157f72d36716c0a22";

// Bulletin Chain endpoints
export const BULLETIN_ENDPOINTS = {
  paseo: {
    ws: "wss://paseo-bulletin-next-rpc.polkadot.io",
    gateway: "https://paseo-bulletin-next-ipfs.polkadot.io/ipfs/",
  },
  pop1: {
    ws: "wss://pop1-testnet.parity-lab.parity.io:443/10000",
    gateway: "https://pop1-testnet.parity-lab.parity.io/ipfs/",
  },
} as const;

export interface UploadOptions {
  /** WebSocket endpoint for Bulletin Chain */
  bulletinEndpoint: string;
  /** IPFS gateway URL for reading (must end with /ipfs/) */
  ipfsGateway: string;
  /** Substrate account derivation path, default: //Alice */
  accountSeed?: string;
}

export interface UploadResult {
  /** CIDv1 string - unique file identifier */
  cid: string;
  /** Block hash where transaction was included */
  blockHash: string;
  /** Full URL to read file from IPFS gateway */
  gatewayUrl: string;
}

/**
 * Create Sr25519 signer from dev seed.
 * DEV_PHRASE is standard Substrate dev mnemonic ("bottom drive obey lake...").
 * //Alice, //Bob, etc. are derivation paths.
 */
function createDevSigner(derivationPath: string) {
  const entropy = mnemonicToEntropy(DEV_PHRASE);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const keypair = derive(derivationPath);
  return getPolkadotSigner(keypair.publicKey, "Sr25519", keypair.sign);
}

/**
 * Check transaction result for errors and return block hash.
 */
function checkTransactionResult(result: unknown): { blockHash: string } {
  const r = result as { dispatchError?: unknown; block: { hash: string } };
  if (r.dispatchError !== undefined && r.dispatchError !== null) {
    const details =
      typeof r.dispatchError === "object"
        ? JSON.stringify(r.dispatchError)
        : String(r.dispatchError);
    throw new Error(`Transaction dispatch error: ${details}`);
  }
  return { blockHash: r.block.hash };
}

/**
 * Upload file to Bulletin Chain.
 *
 * Process:
 * 1. Calculate CID locally (Blake2b-256)
 * 2. Open WebSocket connection to Bulletin node
 * 3. Submit TransactionStorage.store() extrinsic
 * 4. Wait for transaction to be included in block
 * 5. Return CID and gateway URL for reading
 */
export async function uploadToBulletin(
  fileBytes: Uint8Array,
  options: UploadOptions
): Promise<UploadResult> {
  const { accountSeed = "//Alice", bulletinEndpoint, ipfsGateway } = options;

  if (!bulletinEndpoint) {
    throw new Error("bulletinEndpoint is required");
  }
  if (!ipfsGateway) {
    throw new Error("ipfsGateway is required");
  }

  // 1. Calculate CID locally
  const cid = calculateCID(fileBytes);

  // 2. Connect to Bulletin node.
  // In Triangle host, raw WebSocket connections are intercepted and routed to
  // whatever chain the host knows — without a genesis hash it falls back to
  // Asset Hub, which has no TransactionStorage and causes "Incompatible runtime
  // entry". createPapiProvider routes to the correct Bulletin chain via genesis
  // hash; outside the host it falls back to a direct WS connection.
  const wsProvider = getWsProvider(bulletinEndpoint);
  const provider = isInHost()
    ? createPapiProvider(BULLETIN_GENESIS as `0x${string}`, wsProvider)
    : wsProvider;
  const client = createClient(provider);

  try {
    // getUnsafeApi fetches live chain metadata — immune to descriptor staleness after runtime upgrades.
    const api = client.getUnsafeApi();
    const signer = createDevSigner(accountSeed);

    // 3. Create TransactionStorage.store extrinsic
    const storeCall = api.tx.TransactionStorage.store({
      data: Binary.fromBytes(fileBytes) as any,
    });

    // 4. Submit transaction with timeout — signAndSubmit has no built-in timeout and
    // will hang indefinitely if the node is slow or Alice has no BulletinAllowance.
    const UPLOAD_TIMEOUT_MS = 60_000;
    const result = await Promise.race([
      storeCall.signAndSubmit(signer),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Bulletin upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`)),
          UPLOAD_TIMEOUT_MS
        )
      ),
    ]);
    const { blockHash } = checkTransactionResult(result);

    return {
      cid,
      blockHash,
      gatewayUrl: `${ipfsGateway}${cid}`,
    };
  } finally {
    // Always close WebSocket connection
    try {
      client.destroy();
    } catch {
      // ignore close error
    }
  }
}

/**
 * Upload JSON data to Bulletin Chain.
 */
export async function uploadJsonToBulletin(
  data: object,
  options: UploadOptions
): Promise<UploadResult> {
  const jsonString = JSON.stringify(data, null, 2);
  const encoder = new TextEncoder();
  const fileBytes = encoder.encode(jsonString);
  return uploadToBulletin(fileBytes, options);
}

/**
 * Read file from IPFS gateway.
 */
export async function readFromGateway(
  gatewayUrl: string,
  timeoutMs = 30000
): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(gatewayUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Read JSON from IPFS gateway.
 */
export async function readJsonFromGateway<T = unknown>(
  gatewayUrl: string,
  timeoutMs = 30000
): Promise<T> {
  const bytes = await readFromGateway(gatewayUrl, timeoutMs);
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(bytes);
  return JSON.parse(jsonString) as T;
}
