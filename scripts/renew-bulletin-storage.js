import { config } from "dotenv";
import { createClient as createPolkadotClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { bulletin } from "@polkadot-api/descriptors";
import { getPolkadotSigner } from "polkadot-api/signer";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { mnemonicToEntropy, entropyToMiniSecret, DEV_PHRASE } from "@polkadot-labs/hdkd-helpers";
import { CID } from "multiformats/cid";

config();

const BULLETIN_RPC = process.env.BULLETIN_RPC || "wss://bulletin.dotspark.app";
const TARGET_CID = process.env.IPFS_CID || "bafybeibm6rfptryqpmfvffd65qsw5xkuj2l3wwjodtj5ksjkff3hxf7rcy";

function createSigner(mnemonic, derivePath = "") {
  const entropy = mnemonicToEntropy(mnemonic);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const keyPair = derive(derivePath);
  return getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign);
}

async function findStorageTransaction(api, targetCid) {
  console.log(`🔍 Searching for storage transaction with CID: ${targetCid}`);

  // Get current block number
  const currentBlock = await api.query.System.Number.getValue();
  console.log(`   Current block: ${currentBlock}`);

  // Parse target CID to get content hash
  const cid = CID.parse(targetCid);
  const targetHash = cid.multihash.digest;

  console.log(`   Target content hash: 0x${Buffer.from(targetHash).toString('hex')}`);

  // Search backwards from current block (last ~10000 blocks = ~7 days)
  const searchRange = 10000;
  const startBlock = Math.max(0, Number(currentBlock) - searchRange);

  console.log(`   Searching blocks ${startBlock} to ${currentBlock}...`);

  for (let blockNum = Number(currentBlock); blockNum >= startBlock; blockNum -= 100) {
    // Query transaction storage for this block range
    const transactions = await api.query.TransactionStorage.Transactions.getValue(blockNum);

    if (transactions && transactions.length > 0) {
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        // Handle PAPI FixedSizeBinary type
        const txHashBytes = tx.content_hash.asBytes ? tx.content_hash.asBytes() : tx.content_hash;
        const txHash = Buffer.from(txHashBytes).toString('hex');
        const targetHashHex = Buffer.from(targetHash).toString('hex');

        if (txHash === targetHashHex) {
          console.log(`✅ Found storage transaction!`);
          console.log(`   Block: ${blockNum}`);
          console.log(`   Index: ${i}`);
          console.log(`   Content Hash: 0x${txHash}`);
          return { block: blockNum, index: i, info: tx };
        }
      }
    }

    if (blockNum % 1000 === 0) {
      console.log(`   Searched up to block ${blockNum}...`);
    }
  }

  throw new Error(`Storage transaction not found in last ${searchRange} blocks`);
}

async function renewStorage(api, signer, block, index) {
  console.log(`\n🔄 Renewing storage...`);
  console.log(`   Block: ${block}`);
  console.log(`   Index: ${index}`);

  const tx = api.tx.TransactionStorage.renew({ block, index });

  return new Promise((resolve, reject) => {
    const sub = tx.signSubmitAndWatch(signer).subscribe({
      next: (event) => {
        if (event.type === "txBestBlocksState" && event.found) {
          console.log(`   ⏳ Transaction included in block`);
        }
        if (event.type === "finalized") {
          console.log(`✅ Storage renewed successfully!`);
          console.log(`   Finalized in block: ${event.block.number}`);
          sub.unsubscribe();
          resolve(event);
        }
      },
      error: (err) => {
        console.error(`❌ Renewal failed:`, err);
        reject(err);
      },
    });
  });
}

async function main() {
  console.log(`\n📦 Bulletin Storage Renewal\n`);
  console.log(`Bulletin RPC: ${BULLETIN_RPC}`);
  console.log(`Target CID: ${TARGET_CID}\n`);

  // Connect to Bulletin
  const client = createPolkadotClient(withPolkadotSdkCompat(getWsProvider(BULLETIN_RPC)));
  const api = client.getTypedApi(bulletin);

  // Create signer
  const mnemonic = process.env.DOTNS_MNEMONIC || process.env.MNEMONIC || DEV_PHRASE;
  const signer = createSigner(mnemonic, "");

  try {
    // Find the original storage transaction
    const { block, index, info } = await findStorageTransaction(api, TARGET_CID);

    console.log(`\n📊 Transaction Info:`);
    console.log(`   Size: ${info.size} bytes`);
    const chunkRootBytes = info.chunk_root.asBytes ? info.chunk_root.asBytes() : info.chunk_root;
    console.log(`   Chunk Root: 0x${Buffer.from(chunkRootBytes).toString('hex')}`);

    // Renew the storage
    await renewStorage(api, signer, block, index);

    console.log(`\n✨ Done! Storage renewed for another retention period.`);
    console.log(`   Your content will remain accessible at: https://intran3t-app42.paseo.li\n`);

  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  } finally {
    client.destroy();
  }
}

main().catch(console.error);
