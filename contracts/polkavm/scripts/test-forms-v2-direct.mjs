#!/usr/bin/env node
/**
 * Test forms_v2 contract DIRECTLY via wallet.sendTransaction
 * Bypass PAPI to rule out any issues with Revive.call wrapping
 */

import { createPublicClient, createWalletClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const deploymentPath = resolve(__dirname, '../deployment_forms.json');
const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
const contractAddress = deployment.contractAddress;

const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';

const paseoChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
};

const FORMS_ABI = [
  { name: 'registerForm', type: 'function', inputs: [{ name: 'formCid', type: 'bytes' }], outputs: [{ name: 'formId', type: 'uint256' }], stateMutability: 'nonpayable' },
  { name: 'formCount', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'getFormCid', type: 'function', inputs: [{ name: 'formId', type: 'uint64' }], outputs: [{ name: 'cid', type: 'bytes' }], stateMutability: 'view' },
];

const mnemonic = process.env.MNEMONIC || process.env.DOTNS_MNEMONIC;
if (!mnemonic) {
  console.error('❌ MNEMONIC not set in .env');
  process.exit(1);
}

const account = mnemonicToAccount(mnemonic);
const publicClient = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });
const walletClient = createWalletClient({ account, chain: paseoChain, transport: http(EVM_RPC) });

console.log('\n🧪 Testing forms_v2 Contract (Direct EVM Call)\n');
console.log('Contract:', contractAddress);
console.log('Caller:', account.address, '\n');

// Test 1: Check initial formCount
console.log('Test 1: Initial formCount');
const countBefore = await publicClient.readContract({
  address: contractAddress,
  abi: FORMS_ABI,
  functionName: 'formCount',
});
console.log('  formCount before:', countBefore.toString());

// Test 2: Register a form
const testCid = 'bafk2bzacec6rmzaa2m4llgyap74ajy3r3tmbzwm5wp7ijyizk7thujczgk4ss';
const testCidHex = `0x${Buffer.from(testCid).toString('hex')}`;
console.log('\nTest 2: Register form');
console.log('  CID:', testCid);
console.log('  CID hex:', testCidHex);

const registerCalldata = encodeFunctionData({
  abi: FORMS_ABI,
  functionName: 'registerForm',
  args: [testCidHex],
});

console.log('  Calldata:', registerCalldata);

console.log('\n  Sending transaction via wallet.sendTransaction (direct EVM)...');
const txHash = await walletClient.sendTransaction({
  to: contractAddress,
  data: registerCalldata,
});
console.log('  Tx hash:', txHash);

console.log('  Waiting for receipt...');
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
console.log('  Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');

// Test 3: Check formCount after
console.log('\nTest 3: formCount after registration');
const countAfter = await publicClient.readContract({
  address: contractAddress,
  abi: FORMS_ABI,
  functionName: 'formCount',
});
console.log('  formCount after:', countAfter.toString());

if (countAfter > countBefore) {
  console.log('  ✅ Counter incremented!');
} else {
  console.log('  ❌ Counter did NOT increment - storage write failed!');
}

// Test 4: Read back the form CID
const expectedFormId = Number(countAfter);
if (expectedFormId > 0) {
  console.log('\nTest 4: Read form CID');
  console.log('  Form ID:', expectedFormId);

  const storedCid = await publicClient.readContract({
    address: contractAddress,
    abi: FORMS_ABI,
    functionName: 'getFormCid',
    args: [BigInt(expectedFormId)],
  });

  console.log('  Returned hex:', storedCid);

  if (storedCid && storedCid.length > 2) {
    const hexBody = storedCid.startsWith('0x') ? storedCid.slice(2) : storedCid;
    const returnedCid = Buffer.from(hexBody, 'hex').toString('utf8');
    console.log('  Returned CID:', returnedCid);

    if (returnedCid === testCid) {
      console.log('\n✅ COMPLETE SUCCESS: forms_v2 works correctly with direct EVM calls!');
    } else {
      console.log('\n⚠️  CID mismatch:');
      console.log('    Expected:', testCid);
      console.log('    Got:', returnedCid);
    }
  } else {
    console.log('  ❌ No CID returned - storage write failed!');
  }
}

console.log('');
