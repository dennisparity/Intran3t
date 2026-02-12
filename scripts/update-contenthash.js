import { DotNS } from './dotns.js';
import { CID } from 'multiformats/cid';

const DOMAIN = process.env.DOMAIN_NAME || 'intran3t-app42';
const CID_STRING = process.argv[2];
const MNEMONIC = process.env.DOTNS_MNEMONIC || "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const RPC = process.env.PASEO_ASSETHUB_RPC || 'wss://sys.ibp.network/asset-hub-paseo';

if (!CID_STRING) {
  console.error('Usage: node scripts/update-contenthash.js <CID>');
  process.exit(1);
}

console.log(`\n🔄 Updating Contenthash`);
console.log(`   Domain: ${DOMAIN}.dot`);
console.log(`   New CID: ${CID_STRING}`);
console.log(`   RPC: ${RPC}\n`);

try {
  const cid = CID.parse(CID_STRING);
  const client = new DotNS(RPC, MNEMONIC);
  await client.connect();

  console.log('Setting contenthash...');
  const txHash = await client.setContenthash(DOMAIN, cid);
  console.log(`✅ Contenthash updated!`);
  console.log(`   Transaction: ${txHash}`);
  console.log(`   Live at: https://${DOMAIN}.paseo.li\n`);

  await client.disconnect();
  process.exit(0);
} catch (error) {
  console.error(`❌ Failed to update contenthash:`, error.message);
  process.exit(1);
}
