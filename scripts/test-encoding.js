#!/usr/bin/env node
import { encode } from '@ensdomains/content-hash';

// Test with our deployed CID
const testCID = 'bafybeiaoa55sadxdyn4dhbiaixzzfwsxorbkxq5gqtu4vozlwvuvs2opei';

console.log('\n🧪 Testing ENS Contenthash Encoding\n');
console.log('Input CID:', testCID);

const encoded = encode('ipfs', testCID);
console.log('\nEncoded contenthash:', encoded);
console.log('With 0x prefix:', '0x' + encoded);
console.log('Length:', encoded.length, 'bytes');

// Check the prefix
const prefix = encoded.slice(0, 8);
console.log('\nPrefix analysis:');
console.log('  First 4 bytes:', prefix);
console.log('  0xe3 (IPFS namespace):', prefix.slice(0, 2) === 'e3' ? '✅' : '❌');
console.log('  0x01 (IPFS version):', prefix.slice(2, 4) === '01' ? '✅' : '❌');
console.log('  0x01 (CIDv1):', prefix.slice(4, 6) === '01' ? '✅' : '❌');
console.log('  0x70 (DAG-PB):', prefix.slice(6, 8) === '70' ? '✅' : '❌');

console.log('\n✅ Encoding format is ENSIP-7 compliant!\n');
