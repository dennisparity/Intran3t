#!/usr/bin/env node
/**
 * Transfer DotNS domain ownership using DotNS client
 */

import { DotNS, CONTRACTS } from './dotns.js';
import { config } from 'dotenv';
import { namehash } from 'viem';

config();

const ERC721_ABI = [
  {
    name: 'safeTransferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: []
  }
];

const DOMAIN = 'intran3t-app42';
const TO_ADDRESS = process.argv[2];

if (!TO_ADDRESS) {
  console.error('Usage: node transfer-with-abi.js <to-evm-address>');
  console.error('Example: node transfer-with-abi.js 0xed041713db3374bac7b4963c574739fdc5da3604');
  process.exit(1);
}

console.log('\n🔄 Transferring Domain Ownership');
console.log('='.repeat(60));
console.log(`Domain: ${DOMAIN}.dot`);
console.log(`To: ${TO_ADDRESS}`);
console.log('');

const dotns = new DotNS();
await dotns.connect();

console.log(`From: ${dotns.evmAddress}`);
console.log('');

const node = namehash(`${DOMAIN}.dot`);
console.log('Submitting transfer transaction...');

try {
  const txHash = await dotns.contractTransaction(
    CONTRACTS.DOTNS_REGISTRAR,
    0n,  // value
    ERC721_ABI,  // contractAbi
    'safeTransferFrom',
    [dotns.evmAddress, TO_ADDRESS, BigInt(node)]
  );

  console.log(`✅ Transfer successful!`);
  console.log(`Transaction: ${txHash}`);
  console.log('');
  console.log(`${DOMAIN}.dot now owned by: ${TO_ADDRESS}`);
  console.log('');

} catch (error) {
  console.error('❌ Transfer failed:', error.message);
  throw error;
} finally {
  await dotns.disconnect();
}
