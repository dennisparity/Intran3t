#!/usr/bin/env node
// Compute function selectors for AccessPass contract

const { keccak256, toUtf8Bytes } = require('ethers');

const functions = [
  'mintAccessPass(address,string,string,uint256,string,string)',
  'revokeAccessPass(uint256)',
  'isPassValid(uint256)',
  'getPassMetadata(uint256)',
  'totalMinted()',
  'getPassesByHolder(address)',
  'getPassesByLocation(string)',
];

console.log('// Function Selectors for AccessPass Contract\n');

functions.forEach(fn => {
  const hash = keccak256(toUtf8Bytes(fn));
  const selector = hash.slice(0, 10); // '0x' + 8 hex chars = 4 bytes
  const selectorBytes = selector.slice(2).match(/.{2}/g);

  console.log(`// ${fn}`);
  console.log(`const SELECTOR_${fn.split('(')[0].toUpperCase()}: [u8; 4] = [0x${selectorBytes.join(', 0x')}];`);
  console.log('');
});
