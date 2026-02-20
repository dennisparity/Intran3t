#!/usr/bin/env node
/**
 * Quick test of FormsV2 contract
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RPC_URL = 'https://eth-rpc-testnet.polkadot.io';
const CONTRACT_ADDRESS = '0xe2F988c1aD2533F473265aCD9C0699bE47643316';

// Load ABI
const artifactPath = resolve(__dirname, '../artifacts/contracts/FormsV2.sol/FormsV2.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

console.log('\n🧪 Testing FormsV2 Contract\n');
console.log('Contract:', CONTRACT_ADDRESS);
console.log('━'.repeat(60));

async function test() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, provider);

    // Test 1: Read formCount
    console.log('\n📊 Test 1: Reading formCount...');
    const count = await contract.formCount();
    console.log('   ✅ Form count:', count.toString());

    // Test 2: Check if form exists
    console.log('\n📊 Test 2: Checking if form 1 exists...');
    const exists = await contract.formExists(1);
    console.log('   ✅ Form 1 exists:', exists);

    console.log('\n━'.repeat(60));
    console.log('✅ All tests passed! Contract is working.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
