import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';

const CONTRACT = '0xe479926782bf9ceb81cb264200d223ae566d7776';
const RPC = 'https://eth-rpc-testnet.polkadot.io';

const ABI = [{
  name: 'formCount',
  type: 'function',
  inputs: [],
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
}];

const client = createPublicClient({
  chain: { id: 420420417, rpcUrls: { default: { http: [RPC] } } },
  transport: http(RPC)
});

const data = encodeFunctionData({ abi: ABI, functionName: 'formCount' });
const result = await client.call({ to: CONTRACT, data });
console.log('formCount result:', result.data || 'NO DATA');
if (result.data && result.data !== '0x') {
  const count = decodeFunctionResult({ abi: ABI, functionName: 'formCount', data: result.data });
  console.log('Decoded count:', count.toString());
} else {
  console.log('Contract has no code or formCount reverted');
}
