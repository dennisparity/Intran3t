#!/usr/bin/env node
/**
 * Check current state of forms_v2 contract
 */

import { createPublicClient, http } from 'viem';
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

const FORMS_ABI = [
  { name: 'formCount', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'responseCount', type: 'function', inputs: [{ name: 'formId', type: 'uint64' }], outputs: [{ name: 'count', type: 'uint256' }], stateMutability: 'view' },
  { name: 'getFormCid', type: 'function', inputs: [{ name: 'formId', type: 'uint64' }], outputs: [{ name: 'cid', type: 'bytes' }], stateMutability: 'view' },
  { name: 'getResponseCid', type: 'function', inputs: [{ name: 'formId', type: 'uint64' }, { name: 'idx', type: 'uint64' }], outputs: [{ name: 'cid', type: 'bytes' }], stateMutability: 'view' },
];

const publicClient = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });

console.log('\n📊 Contract State Check\n');
console.log('Contract:', contractAddress);
console.log('RPC:', EVM_RPC, '\n');

// Check total form count
const formCount = await publicClient.readContract({
  address: contractAddress,
  abi: FORMS_ABI,
  functionName: 'formCount',
});
console.log('Total forms:', formCount.toString());

// Check each form
for (let i = 1; i <= Number(formCount); i++) {
  console.log(`\n📝 Form ${i}:`);

  const formCid = await publicClient.readContract({
    address: contractAddress,
    abi: FORMS_ABI,
    functionName: 'getFormCid',
    args: [BigInt(i)],
  });

  const cidHex = formCid.startsWith('0x') ? formCid.slice(2) : formCid;
  const formCidStr = cidHex ? Buffer.from(cidHex, 'hex').toString('utf8') : '(empty)';
  console.log('  Form CID:', formCidStr);

  const responseCount = await publicClient.readContract({
    address: contractAddress,
    abi: FORMS_ABI,
    functionName: 'responseCount',
    args: [BigInt(i)],
  });
  console.log('  Responses:', responseCount.toString());

  // Fetch response CIDs
  for (let j = 0; j < Number(responseCount); j++) {
    const responseCid = await publicClient.readContract({
      address: contractAddress,
      abi: FORMS_ABI,
      functionName: 'getResponseCid',
      args: [BigInt(i), BigInt(j)],
    });

    const respCidHex = responseCid.startsWith('0x') ? responseCid.slice(2) : responseCid;
    const respCidStr = respCidHex ? Buffer.from(respCidHex, 'hex').toString('utf8') : '(empty)';
    console.log(`    Response[${j}]:`, respCidStr);
  }
}

console.log('');
