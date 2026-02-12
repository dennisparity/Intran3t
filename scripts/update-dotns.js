#!/usr/bin/env node
/**
 * Update contenthash for existing DotNS domain
 * Usage: DOTNS_DOMAIN=intran3t-app42 node scripts/update-dotns.js <CID>
 */

import { DotNS } from './dotns.js';
import { encodeContenthash } from './deploy.js';
import { CID } from 'multiformats/cid';

const DOMAIN = process.env.DOTNS_DOMAIN || process.env.DOMAIN_NAME || 'intran3t-app42';
const CID_STRING = process.argv[2];
const MNEMONIC = process.env.DOTNS_MNEMONIC || "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const RPC = process.env.DOTNS_RPC || 'wss://sys.ibp.network/asset-hub-paseo';

if (!CID_STRING) {
  console.error('❌ Usage: node scripts/update-dotns.js <CID>');
  console.error('   Example: node scripts/update-dotns.js bafybeiabc123...');
  process.exit(1);
}

console.log(`\n🔄 Updating DotNS Contenthash`);
console.log(`   Domain: ${DOMAIN}.dot`);
console.log(`   New CID: ${CID_STRING}`);
console.log(`   RPC: ${RPC}\n`);

try {
  const cid = CID.parse(CID_STRING);
  const contenthashHex = `0x${encodeContenthash(CID_STRING)}`;

  console.log(`   Connecting...`);

  const client = new DotNS(RPC, MNEMONIC);
  await client.connect();

  console.log(`   Setting contenthash...`);
  const txHash = await client.setContenthash(DOMAIN, contenthashHex);

  console.log(`\n✅ Contenthash updated successfully!`);
  console.log(`   Transaction: ${txHash}`);
  console.log(`   Live at: https://${DOMAIN}.paseo.li\n`);

  await client.disconnect();
  process.exit(0);
} catch (error) {
  console.error(`\n❌ Failed to update contenthash:`);
  console.error(`   ${error.message}\n`);
  process.exit(1);
}
