#!/usr/bin/env node
/**
 * Derive EVM private key from mnemonic
 * Uses standard Ethereum BIP-44 path: m/44'/60'/0'/0/0
 * This matches MetaMask and all standard Ethereum wallets
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to read mnemonic from .env file
let mnemonic = process.env.MNEMONIC || process.env.DOTNS_MNEMONIC;

if (!mnemonic) {
  // Try to read from .env file in project root
  try {
    const envPath = resolve(__dirname, '../../../.env');
    const envContent = readFileSync(envPath, 'utf8');
    const mnemonicMatch = envContent.match(/(?:DOTNS_MNEMONIC|MNEMONIC)="?([^"\n]+)"?/);
    if (mnemonicMatch) {
      mnemonic = mnemonicMatch[1];
    }
  } catch (err) {
    // .env file not found, continue
  }
}

if (!mnemonic) {
  console.error('❌ No mnemonic found!');
  console.error('\nPlease provide your mnemonic in one of these ways:');
  console.error('1. Set MNEMONIC environment variable:');
  console.error('   MNEMONIC="your twelve words here" node scripts/derive-evm-key.mjs');
  console.error('2. Add to .env file in project root:');
  console.error('   MNEMONIC="your twelve words here"');
  process.exit(1);
}

console.log('\n🔐 Deriving EVM Account from Mnemonic\n');
console.log('Derivation Path: m/44\'/60\'/0\'/0/0 (Standard Ethereum)');
console.log('━'.repeat(60));

try {
  // Derive EVM wallet using standard Ethereum path
  const wallet = ethers.Wallet.fromPhrase(mnemonic, null, "m/44'/60'/0'/0/0");

  console.log('\n✅ Successfully derived EVM account:\n');
  console.log('EVM Address:    ', wallet.address);
  console.log('Private Key:    ', wallet.privateKey);
  console.log('\n' + '━'.repeat(60));
  console.log('\n📝 Next Steps:\n');
  console.log('1. Add to your .env file:');
  console.log(`   PRIVATE_KEY=${wallet.privateKey}`);
  console.log('\n2. Or use Hardhat vars (more secure):');
  console.log(`   npx hardhat vars set PRIVATE_KEY`);
  console.log(`   (paste: ${wallet.privateKey})`);
  console.log('\n3. Make sure this address has PAS tokens for gas:');
  console.log(`   https://faucet.polkadot.io/paseo?address=${wallet.address}`);
  console.log('\n' + '━'.repeat(60));
  console.log('\n⚠️  SECURITY WARNING:');
  console.log('• Never share your private key or commit it to git');
  console.log('• Make sure .env is in your .gitignore');
  console.log('• This is the same account you\'d get if you imported');
  console.log('  this mnemonic into MetaMask (account #1)');
  console.log('\n');
} catch (error) {
  console.error('\n❌ Error deriving key:', error.message);
  console.error('\nPlease check that your mnemonic is valid (12 or 24 words)');
  process.exit(1);
}
