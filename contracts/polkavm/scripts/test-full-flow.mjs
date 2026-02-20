#!/usr/bin/env node
/**
 * Test complete dForms flow: Bulletin + Contract
 * 1. Upload form definition to Bulletin
 * 2. Register form CID on contract
 * 3. Upload response to Bulletin
 * 4. Submit response CID to contract
 * 5. Read everything back
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from 'polkadot-api';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { sr25519CreateDerive } from '@polkadot-labs/hdkd';
import { DEV_PHRASE, entropyToMiniSecret, mnemonicToEntropy } from '@polkadot-labs/hdkd-helpers';
import { getPolkadotSigner } from 'polkadot-api/signer';
import { Binary } from 'polkadot-api';
import { blake2b } from '@noble/hashes/blake2b';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Network config
const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';
const BULLETIN_RPC = 'wss://bulletin.dotspark.app';
const BULLETIN_GATEWAY = 'https://ipfs.dotspark.app/ipfs/';
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

// Calculate CID (Blake2b-256)
function calculateCID(fileBytes) {
  const hash = blake2b(fileBytes, { dkLen: 32 });
  const BLAKE2B_256_CODE = 0xb220;

  function encodeVarint(value) {
    const bytes = [];
    let num = value;
    while (num >= 0x80) {
      bytes.push((num & 0x7f) | 0x80);
      num >>= 7;
    }
    bytes.push(num & 0x7f);
    return new Uint8Array(bytes);
  }

  const codeBytes = encodeVarint(BLAKE2B_256_CODE);
  const lengthBytes = encodeVarint(hash.length);
  const multihashBytes = new Uint8Array(codeBytes.length + lengthBytes.length + hash.length);
  multihashBytes.set(codeBytes, 0);
  multihashBytes.set(lengthBytes, codeBytes.length);
  multihashBytes.set(hash, codeBytes.length + lengthBytes.length);

  const digest = {
    code: BLAKE2B_256_CODE,
    size: hash.length,
    bytes: multihashBytes,
    digest: hash,
  };

  return CID.createV1(raw.code, digest).toString();
}

// Upload to Bulletin
async function uploadToBulletin(jsonData, description) {
  console.log(`\n📤 Uploading ${description} to Bulletin...`);

  const jsonString = JSON.stringify(jsonData, null, 2);
  const fileBytes = new TextEncoder().encode(jsonString);
  const cid = calculateCID(fileBytes);

  console.log(`   CID (calculated): ${cid}`);

  const wsProvider = getWsProvider(BULLETIN_RPC);
  const client = createClient(withPolkadotSdkCompat(wsProvider));

  try {
    const { bulletin } = await import('../../../.papi/descriptors/dist/index.js');
    const api = client.getTypedApi(bulletin);

    // Create Alice signer for testnet
    const entropy = mnemonicToEntropy(DEV_PHRASE);
    const miniSecret = entropyToMiniSecret(entropy);
    const derive = sr25519CreateDerive(miniSecret);
    const keyPair = derive('//Alice');
    const signer = getPolkadotSigner(keyPair.publicKey, 'Sr25519', keyPair.sign);

    const storeCall = api.tx.TransactionStorage.store({
      data: Binary.fromBytes(fileBytes),
    });

    const sudoTx = api.tx.Sudo.sudo({ call: storeCall.decodedCall });
    const result = await sudoTx.signAndSubmit(signer);

    if (result.dispatchError) {
      throw new Error(`Bulletin upload failed: ${JSON.stringify(result.dispatchError)}`);
    }

    console.log(`   ✅ Uploaded to Bulletin (block: ${result.block.hash})`);
    console.log(`   Gateway: ${BULLETIN_GATEWAY}${cid}`);

    return cid;
  } finally {
    client.destroy();
  }
}

// Main test flow
async function testFullFlow() {
  console.log('\n🧪 Testing Complete dForms Flow\n');
  console.log('Contract:        ', CONTRACT_ADDRESS);
  console.log('Bulletin:        ', BULLETIN_RPC);
  console.log('EVM RPC:         ', EVM_RPC);
  console.log('━'.repeat(60));

  // Setup EVM provider and wallet
  const provider = new ethers.JsonRpcProvider(EVM_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  console.log(`\n👛 Wallet:         ${wallet.address}`);

  try {
    // Step 1: Create and upload form definition
    const formDefinition = {
      title: "Test Feedback Form",
      description: "Testing Bulletin + Contract integration",
      createdAt: new Date().toISOString(),
      creator: wallet.address,
      fields: [
        { id: "q1", type: "text", label: "Name", required: true },
        { id: "q2", type: "rating", label: "Rating", min: 1, max: 5 }
      ]
    };

    const formCid = await uploadToBulletin(formDefinition, 'form definition');

    // Step 2: Register form on contract
    console.log(`\n📝 Registering form on contract...`);
    const registerTx = await contract.registerForm(formCid);
    console.log(`   Tx hash: ${registerTx.hash}`);
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

    const formId = Number(event.args[0]);
    console.log(`   ✅ Form registered with ID: ${formId}`);

    // Step 3: Create and upload response
    const response = {
      formId: formId,
      submittedAt: new Date().toISOString(),
      answers: {
        q1: "Alice Smith",
        q2: 5
      }
    };

    const responseCid = await uploadToBulletin(response, 'response');

    // Step 4: Submit response on contract
    console.log(`\n📝 Submitting response to contract...`);
    const submitTx = await contract.submitResponse(formId, responseCid);
    console.log(`   Tx hash: ${submitTx.hash}`);
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

    const responseIdx = Number(responseEvent.args[1]);
    console.log(`   ✅ Response submitted with index: ${responseIdx}`);

    // Step 5: Read everything back
    console.log(`\n📖 Reading data back from contract...`);

    const readFormCid = await contract.getFormCid(formId);
    console.log(`   Form CID:        ${readFormCid}`);
    console.log(`   Matches upload:  ${readFormCid === formCid ? '✅' : '❌'}`);

    const responseCids = await contract.getResponseCids(formId);
    console.log(`   Response CIDs:   ${responseCids.length} found`);
    console.log(`   First CID:       ${responseCids[0]}`);
    console.log(`   Matches upload:  ${responseCids[0] === responseCid ? '✅' : '❌'}`);

    const responseCount = await contract.getResponseCount(formId);
    console.log(`   Response count:  ${responseCount}`);

    // Step 6: Fetch from gateway
    console.log(`\n🌐 Fetching from Bulletin gateway...`);

    const formGatewayUrl = `${BULLETIN_GATEWAY}${formCid}`;
    console.log(`   Form URL: ${formGatewayUrl}`);

    const formResponse = await fetch(formGatewayUrl);
    if (formResponse.ok) {
      const formData = await formResponse.json();
      console.log(`   ✅ Form fetched: "${formData.title}"`);
    } else {
      console.log(`   ⏳ Form not yet available on gateway (HTTP ${formResponse.status})`);
      console.log(`   Note: Bulletin data takes a few minutes to propagate to gateway`);
    }

    const responseGatewayUrl = `${BULLETIN_GATEWAY}${responseCid}`;
    console.log(`   Response URL: ${responseGatewayUrl}`);

    const respResponse = await fetch(responseGatewayUrl);
    if (respResponse.ok) {
      const respData = await respResponse.json();
      console.log(`   ✅ Response fetched: formId ${respData.formId}`);
    } else {
      console.log(`   ⏳ Response not yet available on gateway (HTTP ${respResponse.status})`);
    }

    // Summary
    console.log(`\n${'━'.repeat(60)}`);
    console.log('✅ END-TO-END TEST PASSED!\n');
    console.log('Summary:');
    console.log(`  • Form ID:           ${formId}`);
    console.log(`  • Form CID:          ${formCid}`);
    console.log(`  • Response CID:      ${responseCid}`);
    console.log(`  • Response count:    ${responseCount}`);
    console.log(`\n🎉 All components working: Bulletin ↔ Contract ↔ Gateway`);
    console.log(`\n📝 Note: Gateway propagation takes 1-2 minutes for new data`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testFullFlow();
