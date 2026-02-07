#!/usr/bin/env node

/**
 * Generate a test account for DotNS deployment
 */

import { Keyring } from '@polkadot/api'
import { mnemonicGenerate, cryptoWaitReady } from '@polkadot/util-crypto'

console.log('\n🔑 Generating Test Account for DotNS Deployment')
console.log('=' .repeat(60))

// Wait for WASM crypto to initialize
await cryptoWaitReady()

// Generate mnemonic
const mnemonic = mnemonicGenerate(12)

// Create keyring and derive address
const keyring = new Keyring({ type: 'sr25519' })
const account = keyring.addFromMnemonic(mnemonic)

console.log('\n✅ Account Generated!\n')
console.log('Mnemonic (12 words):')
console.log('─'.repeat(60))
console.log(mnemonic)
console.log('─'.repeat(60))
console.log('\nAddress (Substrate):')
console.log('─'.repeat(60))
console.log(account.address)
console.log('─'.repeat(60))
console.log('\n⚠️  IMPORTANT: This is a TEST account only!')
console.log('   DO NOT send real funds to this address')
console.log('\n📝 Next Steps:')
console.log('   1. Copy the mnemonic to .env (DOTNS_MNEMONIC)')
console.log('   2. Get test PAS tokens from: https://faucet.polkadot.io/')
console.log('   3. Use address: ' + account.address)
console.log('   4. Run: npm run deploy:dotns')
console.log('\n' + '='.repeat(60) + '\n')
