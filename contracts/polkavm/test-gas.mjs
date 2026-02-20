import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const artifact = JSON.parse(readFileSync('./artifacts/contracts/FormsV2.sol/FormsV2.json', 'utf8'));
const CONTRACT_ADDRESS = '0xe2F988c1aD2533F473265aCD9C0699bE47643316';
const RPC = 'https://eth-rpc-testnet.polkadot.io';

const provider = new ethers.JsonRpcProvider(RPC);
const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, provider);

const cid = 'bafk2bzaceaetz23xzrgnwv36wrxfj2uvyh5hix3hle4m2l64pullis3amum74';

console.log('Estimating gas for registerForm...');
console.log('CID:', cid);

try {
  const gasEstimate = await contract.registerForm.estimateGas(cid);
  console.log('✅ Gas estimate:', gasEstimate.toString());
} catch (err) {
  console.error('❌ Gas estimation failed:', err.message);
  if (err.data) {
    console.error('Error data:', err.data);
  }
}

// Also try to call it (read-only simulation)
console.log('\nTrying static call (simulation)...');
try {
  await contract.registerForm.staticCall(cid);
  console.log('✅ Static call succeeded');
} catch (err) {
  console.error('❌ Static call failed:', err.message);
  if (err.data) {
    console.error('Error data:', err.data);
  }
}
