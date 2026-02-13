#!/usr/bin/env node
/**
 * Transfer DotNS domain ownership
 * Uses DotNS client with proper Substrate derivation
 */

import { DotNS, CONTRACTS } from './dotns.js';
import { config } from 'dotenv';
import { namehash } from 'viem';

config();

const DOMAIN = 'intran3t-app42';
const TO_ADDRESS = process.argv[2];

if (!TO_ADDRESS) {
  console.error('Usage: node transfer-domain-fixed.js <to-evm-address>');
  console.error('Example: node transfer-domain-fixed.js 0xed041713db3374bac7b4963c574739fdc5da3604');
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

// Transfer using DotNS registrar's ERC-721 safeTransferFrom
const node = namehash(`${DOMAIN}.dot`);

console.log('Submitting transfer transaction...');

try {
  const txHash = await dotns.contractTransaction(
    CONTRACTS.DOTNS_REGISTRAR,
    'safeTransferFrom',
    [dotns.evmAddress, TO_ADDRESS, BigInt(node)]
  );

  console.log(`✅ Transfer successful!`);
  console.log(`Transaction: ${txHash}`);
  console.log('');
  console.log(`${DOMAIN}.dot now owned by: ${TO_ADDRESS}`);
  console.log('');

} catch (error) {
  console.error('❌ Transfer failed:',error.message);
  throw error;
} finally {
  await dotns.disconnect();
}
