#!/usr/bin/env node
/**
 * Test getResponseCount and getResponseCid on deployed contract
 */

import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const ABI = [
  {
    name: 'responseCount',
    type: 'function',
    inputs: [{ name: 'formId', type: 'uint64' }],
    outputs: [{ name: 'count', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getResponseCid',
    type: 'function',
    inputs: [
      { name: 'formId', type: 'uint64' },
      { name: 'idx', type: 'uint64' },
    ],
    outputs: [{ name: 'cid', type: 'bytes' }],
    stateMutability: 'view',
  },
  {
    name: 'getFormCid',
    type: 'function',
    inputs: [{ name: 'formId', type: 'uint64' }],
    outputs: [{ name: 'cid', type: 'bytes' }],
    stateMutability: 'view',
  },
];

const client = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });

console.log('\n🧪 Testing Response Storage\n');
console.log('Contract:', contractAddress);
console.log('Form ID: 1\n');

// Test 1: Get form CID
const formCidData = encodeFunctionData({
  abi: ABI,
  functionName: 'getFormCid',
  args: [1n],
});
const formCidResult = await client.call({ to: contractAddress, data: formCidData });
const formCidHex = decodeFunctionResult({ abi: ABI, functionName: 'getFormCid', data: formCidResult.data });
const formCidBytes = formCidHex.startsWith('0x') ? formCidHex.slice(2) : formCidHex;
const formCid = formCidBytes ? new TextDecoder().decode(
  new Uint8Array(formCidBytes.match(/.{2}/g).map(b => parseInt(b, 16)))
) : '';
console.log('✅ Form CID:', formCid || '(empty)');

// Test 2: Get response count
const countData = encodeFunctionData({
  abi: ABI,
  functionName: 'responseCount',
  args: [1n],
});
const countResult = await client.call({ to: contractAddress, data: countData });
const count = decodeFunctionResult({ abi: ABI, functionName: 'responseCount', data: countResult.data });

console.log('✅ Response count for form 1:', count.toString());

if (count > 0n) {
  console.log('\nFetching response CIDs:\n');
  for (let i = 0; i < Number(count); i++) {
    const cidData = encodeFunctionData({
      abi: ABI,
      functionName: 'getResponseCid',
      args: [1n, BigInt(i)],
    });
    const cidResult = await client.call({ to: contractAddress, data: cidData });
    const cidHex = decodeFunctionResult({ abi: ABI, functionName: 'getResponseCid', data: cidResult.data });
    const hexBody = cidHex.startsWith('0x') ? cidHex.slice(2) : cidHex;
    const cid = hexBody ? new TextDecoder().decode(
      new Uint8Array(hexBody.match(/.{2}/g).map(b => parseInt(b, 16)))
    ) : '';
    console.log(`  Response[${i}]:`, cid);
  }
} else {
  console.log('\n⚠️  No responses recorded on-chain!');
  console.log('   This means either:');
  console.log('   1. The submitResponse contract call reverted silently');
  console.log('   2. The response was submitted to a different form ID');
  console.log('   3. The contract has a bug in submitResponse()');
}

console.log('');
