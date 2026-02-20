import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import * as dotenv from 'dotenv';

dotenv.config();

const CONTRACT = process.env.VITE_FORMS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
const RPC = 'https://eth-rpc-testnet.polkadot.io';

const ABI = [
  { name: 'formCount', type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'getResponseCount', type: 'function', inputs: [{ name: 'formId', type: 'uint64' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'getResponseCid', type: 'function', inputs: [{ name: 'formId', type: 'uint64' }, { name: 'submissionIdx', type: 'uint64' }], outputs: [{ name: 'cid', type: 'bytes' }], stateMutability: 'view' }
];

const client = createPublicClient({
  chain: { id: 420420417, rpcUrls: { default: { http: [RPC] } } },
  transport: http(RPC)
});

console.log('Contract address:', CONTRACT);
console.log('RPC:', RPC);
console.log('\n--- Checking contract deployment ---\n');

// Check if contract has code
const code = await client.getBytecode({ address: CONTRACT });
console.log('Contract has code:', code && code !== '0x' ? 'YES' : 'NO');
console.log('Code size:', code ? code.length : 0, 'bytes');

console.log('\n--- Checking contract state ---\n');

// Get total form count
const formCountData = encodeFunctionData({ abi: ABI, functionName: 'formCount' });
const formCountResult = await client.call({ to: CONTRACT, data: formCountData });
const formCount = decodeFunctionResult({ abi: ABI, functionName: 'formCount', data: formCountResult.data });
console.log('Total forms in contract:', formCount.toString());

// Check each form
for (let i = 1n; i <= formCount; i++) {
  console.log(`\nForm ${i}:`);

  const responseCountData = encodeFunctionData({ abi: ABI, functionName: 'getResponseCount', args: [i] });
  const responseCountResult = await client.call({ to: CONTRACT, data: responseCountData });
  const responseCount = decodeFunctionResult({ abi: ABI, functionName: 'getResponseCount', data: responseCountResult.data });
  console.log(`  Response count: ${responseCount.toString()}`);

  // If there are responses, try to read the first one
  if (responseCount > 0n) {
    const cidData = encodeFunctionData({ abi: ABI, functionName: 'getResponseCid', args: [i, 0n] });
    const cidResult = await client.call({ to: CONTRACT, data: cidData });
    const cid = decodeFunctionResult({ abi: ABI, functionName: 'getResponseCid', data: cidResult.data });
    console.log(`  First response CID: ${cid}`);
  }
}
