import { createPublicClient, http, encodeFunctionData, decodeFunctionResult, createWalletClient, privateKeyToAccount } from 'viem';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC = 'https://eth-rpc-testnet.polkadot.io';
const CHAIN_ID = 420420417;

// Read the compiled contract
const contractBytecode = '0x' + readFileSync('./contracts/polkavm/target/test_minimal.polkavm').toString('hex');

console.log('Contract bytecode size:', contractBytecode.length / 2, 'bytes');
console.log('\n--- Deploying test contract ---\n');

// For testing, we'll deploy with a test private key
// In production, use your actual deployer key
const TEST_PRIVATE_KEY = '0x' + '01'.repeat(32); // Simple test key

const account = privateKeyToAccount(TEST_PRIVATE_KEY);
const client = createPublicClient({
  chain: { id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } },
  transport: http(RPC)
});

const walletClient = createWalletClient({
  account,
  chain: { id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } },
  transport: http(RPC)
});

// Deploy contract
const hash = await walletClient.deployContract({
  abi: [],
  bytecode: contractBytecode,
});

console.log('Deployment tx:', hash);
console.log('Waiting for confirmation...');

const receipt = await client.waitForTransactionReceipt({ hash });
console.log('Contract deployed at:', receipt.contractAddress);

// Test increment function
console.log('\n--- Testing increment ---\n');

const INCREMENT_SELECTOR = '0xd09de08a';
const GET_COUNT_SELECTOR = '0xa87d942c';

// Call increment
const incrementTx = await walletClient.sendTransaction({
  to: receipt.contractAddress,
  data: INCREMENT_SELECTOR,
});

await client.waitForTransactionReceipt({ hash: incrementTx });
console.log('Incremented!');

// Read count
const countResult = await client.call({
  to: receipt.contractAddress,
  data: GET_COUNT_SELECTOR,
});

const count = BigInt(countResult.data);
console.log('Counter value:', count.toString());

console.log('\n✅ Test contract works!');
