import { Buffer } from "buffer";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { config } from "dotenv";
import { sha256 } from "@noble/hashes/sha2.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { createClient as createPolkadotClient } from "polkadot-api";
import { Binary } from "@polkadot-api/substrate-bindings";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getWsProvider } from "polkadot-api/ws-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { bulletin } from "@polkadot-api/descriptors";
import { CID } from "multiformats/cid";
import { create as createMultihash } from "multiformats/hashes/digest";
import { base32 } from "multiformats/bases/base32";
import { base58btc } from "multiformats/bases/base58";
import * as dagPB from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import { DotNS } from "./dotns.js";

config();

const BULLETIN_RPC = process.env.BULLETIN_RPC || "wss://bulletin.dotspark.app";
const CHUNK_SIZE = 1 * 1024 * 1024;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const CID_CONFIG = { version: 1, codec: 0x55, hashCode: 0x12, hashLength: 32 };

export function createCID(data, codec = CID_CONFIG.codec, hashCode = CID_CONFIG.hashCode) {
  let hash;
  if (hashCode === 0xb220) {
    hash = blake2b(data, { dkLen: CID_CONFIG.hashLength });
  } else if (hashCode === 0x12) {
    hash = sha256(data);
  } else {
    throw new Error(`Unsupported hash code: 0x${hashCode.toString(16)}`);
  }
  return CID.createV1(codec, createMultihash(hashCode, hash));
}

export function encodeContenthash(cidString) {
  const decoder = cidString.startsWith("Qm") ? base58btc : base32;
  const cid = CID.parse(cidString, decoder);
  const contenthash = new Uint8Array(cid.bytes.length + 2);
  contenthash[0] = 0xe3;
  contenthash[1] = 0x01;
  contenthash.set(cid.bytes, 2);
  return Buffer.from(contenthash).toString("hex");
}

function toHashingEnum(mhCode) {
  switch (mhCode) {
    case 0xb220: return { type: "Blake2b256", value: undefined };
    case 0x12: return { type: "Sha2_256", value: undefined };
    case 0x1b: return { type: "Keccak256", value: undefined };
    default: throw new Error(`Unhandled multihash code: ${mhCode}`);
  }
}

function createSigner(mnemonic, derivePath = "") {
  const entropy = mnemonicToEntropy(mnemonic);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const keyPair = derive(derivePath);
  return getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign);
}

async function getProvider() {
  console.log(`   Connecting to Bulletin: ${BULLETIN_RPC}`);
  const client = createPolkadotClient(withPolkadotSdkCompat(getWsProvider(BULLETIN_RPC)));
  const typedApi = client.getTypedApi(bulletin);
  const mnemonic = process.env.DOTNS_MNEMONIC || process.env.MNEMONIC || DEV_PHRASE;
  const signer = createSigner(mnemonic, "");
  return { client, typedApi, signer };
}

async function ensureAuthorization(typedApi, signer) {
  if (!BULLETIN_RPC.includes("127.0.0.1") && !BULLETIN_RPC.includes("localhost")) {
    return;
  }
  console.log(`   Local chain - authorizing storage via sudo...`);
  const aliceSS58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
  const sudoTx = typedApi.tx.Sudo.sudo({
    call: {
      type: "TransactionStorage",
      value: {
        type: "authorize_account",
        value: { who: aliceSS58, transactions: 1000, bytes: BigInt(100 * 1024 * 1024) },
      },
    },
  });
  try {
    await new Promise((resolve, reject) => {
      const sub = sudoTx.signSubmitAndWatch(signer).subscribe({
        next: (event) => {
          if (event.type === "txBestBlocksState" && event.found) {
            console.log(`   Authorization granted: 1000 txs, 100 MB`);
            sub.unsubscribe();
            resolve();
          }
        },
        error: (e) => { sub.unsubscribe(); reject(e); },
      });
    });
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes("AlreadyAuthorized") || msg.includes("Sudid")) {
      console.log(`   Already authorized`);
      return;
    }
    console.log(`   Authorization warning: ${msg.split("\n")[0]}`);
  }
}

async function storeChunk(typedApi, signer, chunkBytes) {
  const hashCode = 0x12;
  const cid = createCID(chunkBytes, CID_CONFIG.codec, hashCode);
  console.log(`      codec: 0x${CID_CONFIG.codec.toString(16)}, hash: 0x${hashCode.toString(16)}`);
  const tx = typedApi.tx.TransactionStorage.store({ data: Binary.fromBytes(chunkBytes) });
  const txOpts = {
    customSignedExtensions: {
      ProvideCidConfig: {
        value: { codec: BigInt(CID_CONFIG.codec), hashing: toHashingEnum(hashCode) },
      },
    },
  };
  return new Promise((resolve, reject) => {
    const sub = tx.signSubmitAndWatch(signer, txOpts).subscribe({
      next: (event) => {
        if (event.type === "finalized") {
          console.log(`      CID: ${cid.toString()} (finalized)`);
          sub.unsubscribe();
          resolve({ cid, bytes: chunkBytes, len: chunkBytes.length });
        }
      },
      error: (e) => { sub.unsubscribe(); reject(e); },
    });
  });
}

export async function storeFile(contentBytes) {
  console.log(`\n   Size: ${(contentBytes.length / 1024).toFixed(2)} KB`);
  if (contentBytes.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds 8MB limit. Use chunked deployment.`);
  }
  const hashCode = 0x12;
  const cid = createCID(contentBytes, CID_CONFIG.codec, hashCode);
  console.log(`   CID: ${cid.toString()}`);
  const { client, typedApi, signer } = await getProvider();
  try {
    await ensureAuthorization(typedApi, signer);
    const tx = typedApi.tx.TransactionStorage.store({ data: Binary.fromBytes(contentBytes) });
    const txOpts = {
      customSignedExtensions: {
        ProvideCidConfig: {
          value: { codec: BigInt(CID_CONFIG.codec), hashing: toHashingEnum(hashCode) },
        },
      },
    };
    console.log(`   Submitting...`);
    return new Promise((resolve, reject) => {
      const sub = tx.signSubmitAndWatch(signer, txOpts).subscribe({
        next: (event) => {
          if (event.type === "txBestBlocksState" && event.found) {
            console.log(`   Block: ${event.block.hash}\n`);
            sub.unsubscribe();
            client.destroy();
            resolve(cid.toString());
          }
        },
        error: (e) => { sub.unsubscribe(); client.destroy(); reject(e); },
      });
    });
  } catch (e) {
    client.destroy();
    throw e;
  }
}

export async function storeChunkedContent(chunks) {
  console.log(`\n   Chunks: ${chunks.length}`);
  const totalBytes = chunks.reduce((s, c) => s + c.length, 0);
  console.log(`   Total: ${(totalBytes / 1024).toFixed(2)} KB`);
  const { client, typedApi, signer } = await getProvider();
  try {
    await ensureAuthorization(typedApi, signer);
    console.log(`\n   Storing ${chunks.length} chunks...`);
    const stored = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`   [${i + 1}/${chunks.length}]`);
      stored.push(await storeChunk(typedApi, signer, chunks[i]));
    }
    console.log(`\n   Building DAG-PB...`);
    const fileData = new UnixFS({ type: "file", blockSizes: stored.map((c) => BigInt(c.len)) });
    const dagNode = dagPB.prepare({
      Data: fileData.marshal(),
      Links: stored.map((c) => ({ Name: "", Tsize: c.len, Hash: c.cid })),
    });
    const dagBytes = dagPB.encode(dagNode);
    const hashCode = 0x12;
    const rootCid = createCID(dagBytes, 0x70, hashCode);
    console.log(`   Storing root node...`);
    const tx = typedApi.tx.TransactionStorage.store({ data: Binary.fromBytes(dagBytes) });
    const txOpts = {
      customSignedExtensions: {
        ProvideCidConfig: { value: { codec: BigInt(0x70), hashing: toHashingEnum(hashCode) } },
      },
    };
    return new Promise((resolve, reject) => {
      const sub = tx.signSubmitAndWatch(signer, txOpts).subscribe({
        next: (event) => {
          if (event.type === "finalized") {
            console.log(`   Root CID: ${rootCid.toString()} (finalized)\n`);
            sub.unsubscribe();
            client.destroy();
            resolve(rootCid.toString());
          }
        },
        error: (e) => { sub.unsubscribe(); client.destroy(); reject(e); },
      });
    });
  } catch (e) {
    client.destroy();
    throw e;
  }
}

export function chunk(data, size = CHUNK_SIZE) {
  const chunks = [];
  let offset = 0;
  while (offset < data.length) {
    const end = Math.min(offset + size, data.length);
    chunks.push(new Uint8Array(data.subarray(offset, end)));
    offset = end;
  }
  return chunks;
}

export function hasIPFS() {
  try {
    execSync("ipfs version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function merkleize(directoryPath, outputCarPath) {
  if (!hasIPFS()) {
    throw new Error("IPFS CLI not installed. Install from: https://docs.ipfs.tech/install/");
  }
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }
  console.log(`   Merkleizing: ${directoryPath}`);
  const cid = execSync(
    `ipfs add -Q -r --cid-version=1 --raw-leaves --pin=false "${directoryPath}"`,
    { encoding: "utf-8" }
  ).trim();
  if (!cid) throw new Error("Failed to get CID from IPFS");
  execSync(`ipfs dag export ${cid} > "${outputCarPath}"`);
  if (!fs.existsSync(outputCarPath)) {
    throw new Error("Failed to create CAR file");
  }
  const size = fs.statSync(outputCarPath).size;
  console.log(`   CAR: ${(size / 1024 / 1024).toFixed(2)} MB`);
  return { carPath: outputCarPath, cid };
}

export async function storeDirectory(directoryPath) {
  const carPath = path.join(path.dirname(directoryPath), `${path.basename(directoryPath)}.car`);
  const { cid: ipfsCid } = await merkleize(directoryPath, carPath);
  const carBuffer = fs.readFileSync(carPath);
  const CHUNK_SIZE_1_5MB = 1.5 * 1024 * 1024;
  const carChunks = chunk(carBuffer, CHUNK_SIZE_1_5MB);
  const storageCid = await storeChunkedContent(carChunks);
  return { storageCid, ipfsCid };
}

export async function deploy(content, domainName = null) {
  let cid, ipfsCid;
  console.log("\n" + "=".repeat(60));
  console.log("Storage");
  console.log("=".repeat(60));

  if (process.env.IPFS_CID) {
    cid = process.env.IPFS_CID;
    ipfsCid = cid;
    console.log(`\n   Using CID: ${cid}`);
  } else if (Array.isArray(content)) {
    console.log(`\n   Mode: Multi-chunk (${content.length} chunks)`);
    cid = await storeChunkedContent(content);
  } else if (typeof content === "string") {
    const contentPath = path.resolve(content);
    if (!fs.existsSync(contentPath)) throw new Error(`Path not found: ${contentPath}`);
    const stats = fs.statSync(contentPath);
    if (stats.isDirectory()) {
      console.log(`\n   Mode: Directory`);
      console.log(`   Path: ${contentPath}`);
      const result = await storeDirectory(contentPath);
      cid = result.storageCid;
      ipfsCid = result.ipfsCid;
    } else {
      console.log(`\n   Mode: File`);
      console.log(`   Path: ${contentPath}`);
      const fileContent = fs.readFileSync(contentPath);
      if (fileContent.length > MAX_FILE_SIZE) {
        console.log(`   Exceeds 8MB, chunking...`);
        cid = await storeChunkedContent(chunk(fileContent));
      } else {
        cid = await storeFile(new Uint8Array(fileContent));
      }
    }
  } else if (content instanceof Uint8Array) {
    console.log(`\n   Mode: Bytes`);
    if (content.length > MAX_FILE_SIZE) {
      console.log(`   Exceeds 8MB, chunking...`);
      cid = await storeChunkedContent(chunk(content));
    } else {
      cid = await storeFile(content);
    }
  } else {
    throw new Error("Invalid content: must be path, Uint8Array, or Array<Uint8Array>");
  }

  const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  const name = domainName ? domainName.replace(".dot", "") : `test-domain-${Date.now().toString(36)}${randomSuffix}`;

  console.log("\n" + "=".repeat(60));
  console.log("Dotns");
  console.log("=".repeat(60));
  console.log(`   Domain: ${name}.dot`);

  const dotns = new DotNS();
  await dotns.connect();
  const { owned, owner } = await dotns.checkOwnership(name);

  if (owned) {
    console.log(`   Domain ${name}.dot is already owned by you!`);
  } else if (owner && owner !== "0x0000000000000000000000000000000000000000") {
    throw new Error(`Domain ${name}.dot is owned by ${owner}, not ${dotns.evmAddress}`);
  } else {
    console.log(`   Domain ${name}.dot is available, registering...`);
    await dotns.register(name, { status: "none" });
  }

  const contenthashHex = `0x${encodeContenthash(cid)}`;
  await dotns.setContenthash(name, contenthashHex);
  dotns.disconnect();

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`   Domain: ${name}.dot`);
  console.log(`   URL: https://${name}.paseo.li`);
  console.log(`   URL: https://${name}.bigtava.online`);
  console.log("=".repeat(60) + "\n");

  return {
    domainName: name,
    fullDomain: `${name}.dot`,
    cid,
    ipfsCid,
    url: `https://${name}.paseo.li`,
    altUrl: `https://${name}.bigtava.online`,
  };
}
