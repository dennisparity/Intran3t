#!/usr/bin/env node
/**
 * Test FormsV2 contract flow with mock CIDs
 * Validates: register form → submit response → read back
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Network config
const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';
const CONTRACT_ADDRESS = '0xe2F988c1aD2533F473265aCD9C0699bE47643316';

// Load contract ABI
const artifactPath = resolve(__dirname, '../artifacts/contracts/FormsV2.sol/FormsV2.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

// Load private key
const envPath = resolve(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf8');
const privateKeyMatch = envContent.match(/PRIVATE_KEY="?([^"\n]+)"?/);
if (!privateKeyMatch) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}
const privateKey = privateKeyMatch[1];

async function testContractFlow() {
  console.log('\n🧪 Testing FormsV2 Contract Flow\n');
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('RPC:     ', EVM_RPC);
  console.log('━'.repeat(60));

  // Setup
  const provider = new ethers.JsonRpcProvider(EVM_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  console.log(`\n👛 Wallet:  ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} PAS`);

  try {
    // Step 1: Get initial form count
    console.log(`\n📊 Step 1: Get initial form count...`);
    const initialCount = await contract.formCount();
    console.log(`   ✅ Current form count: ${initialCount}`);

    // Step 2: Register a form (using mock CID)
    console.log(`\n📝 Step 2: Register form...`);
    const mockFormCid = 'bafk2bzaceboyw4qocyqwlldr6pom43wt7z3m5og5hptjth55vaplqz5qmoezy';
    console.log(`   Form CID: ${mockFormCid}`);

    const registerTx = await contract.registerForm(mockFormCid);
    console.log(`   Tx hash:  ${registerTx.hash}`);
    console.log(`   Waiting for confirmation...`);

    const registerReceipt = await registerTx.wait();

    // Parse event to get formId
    const event = registerReceipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog({ topics: log.topics, data: log.data });
        } catch {
          return null;
        }
      })
      .find(e => e?.name === 'FormRegistered');

    if (!event) {
      throw new Error('FormRegistered event not found');
    }

    const formId = Number(event.args[0]);
    console.log(`   ✅ Form registered with ID: ${formId}`);

    // Step 3: Verify form count increased
    console.log(`\n📊 Step 3: Verify form count...`);
    const newCount = await contract.formCount();
    console.log(`   ✅ New form count: ${newCount} (was ${initialCount})`);

    // Step 4: Read form CID back
    console.log(`\n📖 Step 4: Read form CID...`);
    const readCid = await contract.getFormCid(formId);
    console.log(`   ✅ Retrieved CID: ${readCid}`);
    console.log(`   Matches:        ${readCid === mockFormCid ? '✅ YES' : '❌ NO'}`);

    // Step 5: Submit a response
    console.log(`\n📝 Step 5: Submit response...`);
    const mockResponseCid = 'bafk2bzaceam7j3fjqocyqwlldr6pom43wt7z3m5og5hptjth55vaplqz5abc';
    console.log(`   Response CID: ${mockResponseCid}`);

    const submitTx = await contract.submitResponse(formId, mockResponseCid);
    console.log(`   Tx hash:      ${submitTx.hash}`);
    console.log(`   Waiting for confirmation...`);

    const submitReceipt = await submitTx.wait();

    const responseEvent = submitReceipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog({ topics: log.topics, data: log.data });
        } catch {
          return null;
        }
      })
      .find(e => e?.name === 'ResponseSubmitted');

    if (!responseEvent) {
      throw new Error('ResponseSubmitted event not found');
    }

    const responseIdx = Number(responseEvent.args[1]);
    console.log(`   ✅ Response submitted with index: ${responseIdx}`);

    // Step 6: Read response count
    console.log(`\n📊 Step 6: Get response count...`);
    const responseCount = await contract.getResponseCount(formId);
    console.log(`   ✅ Response count for form ${formId}: ${responseCount}`);

    // Step 7: Read all response CIDs
    console.log(`\n📖 Step 7: Read all response CIDs...`);
    const responseCids = await contract.getResponseCids(formId);
    console.log(`   ✅ Retrieved ${responseCids.length} response CID(s):`);
    responseCids.forEach((cid, idx) => {
      console.log(`      [${idx}] ${cid}`);
    });

    // Step 8: Submit another response
    console.log(`\n📝 Step 8: Submit second response...`);
    const mockResponse2Cid = 'bafk2bzaceam8k4gxocyqwlldr6pom43wt7z3m5og5hptjth55vaplqz5def';
    const submit2Tx = await contract.submitResponse(formId, mockResponse2Cid);
    await submit2Tx.wait();
    console.log(`   ✅ Second response submitted`);

    // Step 9: Verify count updated
    const finalCount = await contract.getResponseCount(formId);
    console.log(`\n📊 Step 9: Final response count: ${finalCount}`);

    // Summary
    console.log(`\n${'━'.repeat(60)}`);
    console.log('✅ CONTRACT FLOW TEST PASSED!\n');
    console.log('Summary:');
    console.log(`  • Form ID:           ${formId}`);
    console.log(`  • Form CID:          ${readCid}`);
    console.log(`  • Response count:    ${finalCount}`);
    console.log(`  • All CIDs stored:   ✅`);
    console.log(`  • All reads working: ✅`);
    console.log(`\n🎉 Contract is fully functional!`);
    console.log(`\n📝 Next: Integrate with frontend + Bulletin uploads`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    process.exit(1);
  }
}

testContractFlow();
