#!/usr/bin/env node
/**
 * Test debug ABI parsing contract - uses viem to encode bytes parameter
 * Tests if our ABI parsing logic (same as forms_v2) works correctly
 */

import { createPublicClient, createWalletClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const deploymentPath = resolve(__dirname, '../deployment_debug_abi.json');
const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
const contractAddress = deployment.contractAddress;

const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';

const paseoChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
};

// ABI for our test contract (mirrors forms_v2 pattern)
const ABI = [
  {
    name: 'storeAbiBytes',
    type: 'function',
    inputs: [{ name: 'data', type: 'bytes' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'readAbiBytes',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
  },
];

const mnemonic = process.env.MNEMONIC || process.env.DOTNS_MNEMONIC;
if (!mnemonic) {
  console.error('❌ MNEMONIC not set in .env');
  process.exit(1);
}

const account = mnemonicToAccount(mnemonic);
const publicClient = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });
const walletClient = createWalletClient({ account, chain: paseoChain, transport: http(EVM_RPC) });

console.log('\n🧪 Testing Debug ABI Parsing Contract\n');
console.log('Contract:', contractAddress);
console.log('Deployer:', account.address, '\n');

// Test 1: Store bytes using ABI encoding (same as registerForm)
const testData = 'bafk2bzacec6rmzaa2m4llgyap74ajy3r3tmbzwm5wp7ijyizk7thujczgk4ss';
const testDataHex = `0x${Buffer.from(testData).toString('hex')}`;
console.log('Test 1: Store ABI-encoded bytes');
console.log('  Data:', testData);
console.log('  Hex:', testDataHex);
console.log('  Length:', testData.length, 'bytes');

// Encode with viem - this is EXACTLY how the frontend encodes it
const storeCalldata = encodeFunctionData({
  abi: ABI,
  functionName: 'storeAbiBytes',
  args: [testDataHex],
});

console.log('  Full calldata:', storeCalldata);
console.log('  Calldata length:', storeCalldata.length - 2, 'hex chars =', (storeCalldata.length - 2) / 2, 'bytes');

console.log('\n  Sending transaction...');
const storeTxHash = await walletClient.sendTransaction({
  to: contractAddress,
  data: storeCalldata,
});
console.log('  Tx hash:', storeTxHash);

console.log('  Waiting for confirmation...');
const storeReceipt = await publicClient.waitForTransactionReceipt({ hash: storeTxHash });
console.log('  Status:', storeReceipt.status === 'success' ? '✅ Success' : '❌ Failed');

// Test 2: Read bytes back using ABI decoding
console.log('\nTest 2: Read ABI-encoded bytes back');

const readCalldata = encodeFunctionData({
  abi: ABI,
  functionName: 'readAbiBytes',
});

const readResult = await publicClient.call({
  to: contractAddress,
  data: readCalldata,
});

const returnedHex = readResult.data || '0x';
console.log('  Returned hex:', returnedHex);

if (returnedHex.length > 2) {
  // Decode the ABI-encoded bytes return value
  const decoded = decodeFunctionResult({
    abi: ABI,
    functionName: 'readAbiBytes',
    data: returnedHex,
  });

  console.log('  Decoded hex:', decoded);

  const decodedHex = decoded.startsWith('0x') ? decoded.slice(2) : decoded;
  const returnedText = Buffer.from(decodedHex, 'hex').toString('utf8');
  console.log('  Returned text:', returnedText);

  if (returnedText === testData) {
    console.log('\n✅ SUCCESS: ABI parsing works! Stored and retrieved data match.');
    console.log('   This proves the ABI parsing logic is CORRECT.');
  } else {
    console.log('\n❌ MISMATCH:');
    console.log('  Expected:', testData);
    console.log('  Got:', returnedText);
  }
} else {
  console.log('\n❌ FAILED: No data returned (storage empty or ABI parsing failed)');
  console.log('   This means the ABI parsing logic has a BUG.');
}

console.log('');
