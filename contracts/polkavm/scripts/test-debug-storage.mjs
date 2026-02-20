#!/usr/bin/env node
/**
 * Test debug storage contract - store bytes and read them back
 */

import { createPublicClient, createWalletClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const deploymentPath = resolve(__dirname, '../deployment_debug.json');
const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
const contractAddress = deployment.contractAddress;

const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';

const paseoChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
};

// Selectors from forms_debug.rs
const SEL_STORE_BYTES = '0x01020304';
const SEL_READ_BYTES = '0x05060708';

const mnemonic = process.env.MNEMONIC || process.env.DOTNS_MNEMONIC;
if (!mnemonic) {
  console.error('❌ MNEMONIC not set in .env');
  process.exit(1);
}

const account = mnemonicToAccount(mnemonic);
const publicClient = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });
const walletClient = createWalletClient({ account, chain: paseoChain, transport: http(EVM_RPC) });

console.log('\n🧪 Testing Debug Storage Contract\n');
console.log('Contract:', contractAddress);
console.log('Deployer:', account.address, '\n');

// Test 1: Store some bytes
const testData = 'Hello PolkaVM Storage!';
const testDataHex = `0x${Buffer.from(testData).toString('hex')}`;
console.log('Test 1: Store bytes');
console.log('  Data:', testData);
console.log('  Hex:', testDataHex);

const storeCalldata = SEL_STORE_BYTES + testDataHex.slice(2);
console.log('  Calldata:', storeCalldata);

console.log('\n  Sending transaction...');
const storeTxHash = await walletClient.sendTransaction({
  to: contractAddress,
  data: storeCalldata,
});
console.log('  Tx hash:', storeTxHash);

console.log('  Waiting for confirmation...');
const storeReceipt = await publicClient.waitForTransactionReceipt({ hash: storeTxHash });
console.log('  Status:', storeReceipt.status === 'success' ? '✅ Success' : '❌ Failed');

// Test 2: Read bytes back
console.log('\nTest 2: Read bytes back');
const readResult = await publicClient.call({
  to: contractAddress,
  data: SEL_READ_BYTES,
});

const returnedHex = readResult.data || '0x';
console.log('  Returned hex:', returnedHex);

if (returnedHex.length > 2) {
  const returnedBytes = returnedHex.slice(2);
  const returnedText = Buffer.from(returnedBytes, 'hex').toString('utf8');
  console.log('  Returned text:', returnedText);

  if (returnedText === testData) {
    console.log('\n✅ SUCCESS: Storage works! Stored and retrieved data match.');
  } else {
    console.log('\n❌ MISMATCH:');
    console.log('  Expected:', testData);
    console.log('  Got:', returnedText);
  }
} else {
  console.log('\n❌ FAILED: No data returned (storage empty or read failed)');
}

console.log('');
