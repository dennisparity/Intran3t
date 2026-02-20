import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const artifact = JSON.parse(readFileSync('./artifacts/contracts/FormsV2.sol/FormsV2.json', 'utf8'));
const iface = new ethers.Interface(artifact.abi);

// From error log
const calldata = '0x2a9f64ad0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003e6261666b32627a6163656165747a3233787a72676e77763336777278666a32757679683568697833686c65346d326c363470756c6c697333616d756d37340000';

console.log('Decoding calldata from frontend error:');
console.log('Calldata:', calldata);
console.log('Length:', calldata.length, 'characters');

try {
  const decoded = iface.parseTransaction({ data: calldata });
  console.log('\nFunction:', decoded.name);
  console.log('Args:', decoded.args);
  console.log('CID:', decoded.args[0]);
  console.log('CID length:', decoded.args[0].length);
} catch (err) {
  console.error('Decode error:', err.message);
}

// Now encode what it SHOULD be
const cid = 'bafk2bzaceaetz23xzrgnwv36wrxfj2uvyh5hix3hle4m2l64pullis3amum74';
console.log('\n---');
console.log('Encoding correct CID:', cid);
const encoded = iface.encodeFunctionData('registerForm', [cid]);
console.log('Correct calldata:', encoded);
console.log('Match:', encoded === calldata ? '✅' : '❌');
