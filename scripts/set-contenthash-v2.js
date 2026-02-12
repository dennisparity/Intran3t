#!/usr/bin/env node
import { config } from 'dotenv';
import { CID } from 'multiformats/cid';
import { Buffer } from 'buffer';
import { DotNS } from './dotns.js';

config();

const cidString = 'bafybeibm6rfptryqpmfvffd65qsw5xkuj2l3wwjodtj5ksjkff3hxf7rcy';
const cid = CID.parse(cidString);

// Method 2: WITH IPFS version byte (0xe3 0x01 + CID bytes)
const contenthash = new Uint8Array(2 + cid.bytes.length);
contenthash[0] = 0xe3;
contenthash[1] = 0x01;
contenthash.set(cid.bytes, 2);
const contenthashHex = '0x' + Buffer.from(contenthash).toString('hex');

console.log('\n📝 Contenthash with IPFS version byte (Method 2):');
console.log('   ', contenthashHex);
console.log('    Length:', contenthash.length, 'bytes');
console.log('    Format: 0xe3 + 0x01 + CID bytes');
console.log();
console.log('🔧 Setting contenthash on DotNS...\n');

const dotns = new DotNS();
await dotns.connect();

try {
  await dotns.setContenthash('intran3t-app42', contenthashHex);
  console.log('\n✅ Contenthash updated successfully!');
  console.log('🌐 Test at: https://intran3t-app42.paseo.li');
} catch (error) {
  console.error('\n❌ Error:', error.message);
  throw error;
} finally {
  dotns.disconnect();
}
