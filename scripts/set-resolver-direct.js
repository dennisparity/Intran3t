import { config } from "dotenv";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { paseo } from "@polkadot-api/descriptors";
import { getPolkadotSigner } from "polkadot-api/signer";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { mnemonicToEntropy, entropyToMiniSecret } from "@polkadot-labs/hdkd-helpers";
import { Binary } from "@polkadot-api/substrate-bindings";
import { keccak_256 } from "@noble/hashes/sha3.js";

config();

const RPC = "wss://sys.ibp.network/asset-hub-paseo";
const REGISTRY_ADDRESS = "0x4Da0d37aBe96C06ab19963F31ca2DC0412057a6f";
const RESOLVER_ADDRESS = "0x95645C7fD0fF38790647FE13F87Eb11c1DCc8514";
const DOMAIN = "intran3t-app42";

function createSigner(mnemonic) {
  const entropy = mnemonicToEntropy(mnemonic);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const keyPair = derive("");
  return getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign);
}

function namehash(name) {
  const labels = name.split('.').reverse();
  let node = new Uint8Array(32);
  for (const label of labels) {
    const labelBytes = new TextEncoder().encode(label);
    const labelHash = keccak_256(labelBytes);
    const combined = new Uint8Array(64);
    combined.set(node);
    combined.set(labelHash, 32);
    node = keccak_256(combined);
  }
  return `0x${Buffer.from(node).toString('hex')}`;
}

console.log("\n🔧 Setting DotNS Resolver");
console.log("=".repeat(60));

const client = createClient(withPolkadotSdkCompat(getWsProvider(RPC)));
const api = client.getTypedApi(paseo);
const mnemonic = process.env.DOTNS_MNEMONIC;
const signer = createSigner(mnemonic);

const node = namehash(`${DOMAIN}.dot`);
console.log(`Domain: ${DOMAIN}.dot`);
console.log(`Node: ${node}`);
console.log(`Resolver: ${RESOLVER_ADDRESS}\n`);

// ABI for setResolver(bytes32 node, address resolver)
const setResolverSelector = "0x1896f70a";
const nodeBytes = node.slice(2); // Remove 0x
const resolverBytes = RESOLVER_ADDRESS.slice(2).padStart(64, '0'); // Pad to 32 bytes
const callData = setResolverSelector + nodeBytes + resolverBytes;

console.log(`Calling registry.setResolver()...`);
const tx = api.tx.Revive.call({
  dest: { type: "Address20", value: Binary.fromHex(REGISTRY_ADDRESS) },
  value: 0n,
  gas_limit: { ref_time: 10000000000n, proof_size: 200000n },
  storage_deposit_limit: undefined,
  data: Binary.fromHex(callData)
});

const result = await tx.signSubmitAndWatch(signer);
await result.ok;

console.log("\n✅ Resolver set successfully!");
console.log("=".repeat(60));
console.log(`\nNow run the contenthash update.\n`);

client.destroy();
