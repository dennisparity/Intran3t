import { bulletin } from "@polkadot-api/descriptors";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { Binary, createClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { calculateCID } from "./cid";

// Bulletin Chain endpoints
export const BULLETIN_ENDPOINTS = {
  dotspark: {
    ws: "wss://bulletin.dotspark.app",
    gateway: "https://ipfs.dotspark.app/ipfs/",
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

  // 2. Connect to Bulletin node via WebSocket
  // withPolkadotSdkCompat is REQUIRED wrapper - without it WS communication
  // with Substrate nodes won't work correctly
  const wsProvider = getWsProvider(bulletinEndpoint);
  const client = createClient(withPolkadotSdkCompat(wsProvider));

  try {
    // getTypedApi uses generated PAPI descriptors for type-safe API
    const api = client.getTypedApi(bulletin);
    const signer = createDevSigner(accountSeed);

    // 3. Create TransactionStorage.store extrinsic
    const storeCall = api.tx.TransactionStorage.store({
      data: Binary.fromBytes(fileBytes),
    });

    // 4. Submit transaction
    // For //Alice we use sudo to bypass authorization limits on testnet.
    // For other accounts, direct call is used (requires authorization on chain).
    let blockHash: string;

    if (accountSeed === "//Alice") {
      const sudoTx = api.tx.Sudo.sudo({ call: storeCall.decodedCall });
      const result = await sudoTx.signAndSubmit(signer);
      ({ blockHash } = checkTransactionResult(result));
    } else {
      const result = await storeCall.signAndSubmit(signer);
      ({ blockHash } = checkTransactionResult(result));
    }

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
