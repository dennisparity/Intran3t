#!/usr/bin/env node

/**
 * DotNS Deployment Script for Intran3t
 *
 * Deploys static build to Polkadot Bulletin + DotNS
 *
 * Usage:
 *   node scripts/deploy-dotns.js
 *
 * Environment variables:
 *   DOTNS_MNEMONIC - 12-word mnemonic for signing transactions
 *   DOTNS_DOMAIN - Domain name (e.g., "intran3t-test42")
 *   BULLETIN_RPC - Bulletin chain RPC (default: wss://bulletin.dotspark.app)
 *   PASEO_ASSETHUB_RPC - Paseo Asset Hub RPC (default: wss://passet-hub-paseo.ibp.network)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { u8aToHex } from '@polkadot/util'
import { mnemonicToMiniSecret, blake2AsU8a } from '@polkadot/util-crypto'
import dotenv from 'dotenv'

dotenv.config()

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

// Configuration
const BUILD_DIR = path.join(projectRoot, 'dist')
const CAR_OUTPUT = path.join(projectRoot, 'dist.car')
const DOMAIN_NAME = process.env.DOTNS_DOMAIN || 'intran3t-test42'
const MNEMONIC = process.env.DOTNS_MNEMONIC
const BULLETIN_RPC = process.env.BULLETIN_RPC || 'wss://bulletin.dotspark.app'
const PASEO_RPC = process.env.PASEO_ASSETHUB_RPC || 'wss://passet-hub-paseo.ibp.network'

console.log('🚀 Intran3t DotNS Deployment')
console.log('============================\n')

// Validate environment
function validateEnvironment() {
  if (!MNEMONIC || MNEMONIC === '') {
    console.error('❌ Error: DOTNS_MNEMONIC not set')
    console.error('   Add your mnemonic to .env file')
    console.error('   Get test tokens: https://faucet.polkadot.io/')
    process.exit(1)
  }

  // Validate domain name
  if (!/^[a-z0-9-]{6,}[0-9]{2}$/.test(DOMAIN_NAME)) {
    console.error('❌ Error: Invalid domain name')
    console.error('   Must be 8+ chars with exactly 2 trailing digits')
    console.error(`   Got: ${DOMAIN_NAME}`)
    console.error('   Examples: intran3t-test42, my-app-demo99')
    process.exit(1)
  }

  console.log('✅ Environment validated')
  console.log(`   Domain: ${DOMAIN_NAME}.dot`)
  console.log(`   Bulletin RPC: ${BULLETIN_RPC}`)
  console.log(`   Paseo RPC: ${PASEO_RPC}\n`)
}

// Step 1: Build the application
async function buildApp() {
  console.log('📦 Step 1: Building application...')

  try {
    await execAsync('npm run build', { cwd: projectRoot })
    console.log('✅ Build successful!')

    const stats = await fs.stat(BUILD_DIR)
    if (!stats.isDirectory()) {
      throw new Error('dist/ is not a directory')
    }

    console.log(`   Output: ${BUILD_DIR}`)
    return true
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    return false
  }
}

// Step 2: Create CAR file from dist/
async function createCARFile() {
  console.log('\n📁 Step 2: Creating CAR file...')

  try {
    const { stdout } = await execAsync(
      `ipfs add -r "${BUILD_DIR}" --wrap-with-directory --cid-version 1 --quieter`,
      { cwd: projectRoot }
    )

    const rootCID = stdout.trim()
    console.log(`✅ Root CID: ${rootCID}`)

    await execAsync(
      `ipfs dag export "${rootCID}" > "${CAR_OUTPUT}"`,
      { cwd: projectRoot, shell: '/bin/bash' }
    )

    const carStats = await fs.stat(CAR_OUTPUT)
    const carSizeMB = (carStats.size / 1024 / 1024).toFixed(2)

    console.log(`✅ CAR file created: ${CAR_OUTPUT}`)
    console.log(`   Size: ${carSizeMB} MB`)

    return { rootCID, carPath: CAR_OUTPUT, carSize: carStats.size }
  } catch (error) {
    console.error('❌ CAR creation failed:', error.message)
    throw error
  }
}

// Step 3: Skip Bulletin Upload (requires governance authorization)
async function skipBulletinUpload(rootCID) {
  console.log('\n⏭️  Step 3: Bulletin Chain Upload (SKIPPED)')
  console.log('   ─────────────────────────────────────────────────────')
  console.log('   ⚠️  Bulletin storage requires governance authorization')
  console.log('   ')
  console.log('   How Bulletin storage works:')
  console.log('   1. Root call: transactionStorage.authorize_preimage(hash)')
  console.log('   2. User call: transactionStorage.store(data)')
  console.log('   ')
  console.log('   Authorization options:')
  console.log('   • Via PoP chain bridge (official workflow)')
  console.log('   • Via governance proposal (requires approval)')
  console.log('   ')
  console.log('   Current Status:')
  console.log('   ✅ CAR file created locally')
  console.log('   ✅ IPFS CID generated: ' + rootCID)
  console.log('   ⏭️  Bulletin upload skipped (no authorization)')
  console.log('   ')
  console.log('   For now, we\'ll use the CID directly in DotNS contenthash.')
  console.log('   Content can be hosted on IPFS gateways until Bulletin')
  console.log('   authorization is available.')
  console.log('   ─────────────────────────────────────────────────────\n')

  return true
}

// Step 4: Register domain and set contenthash
async function registerDomain(rootCID) {
  console.log('\n🌐 Step 4: Registering domain on Paseo Asset Hub...')
  console.log('   Note: This requires DotNS contracts integration')
  console.log('   Currently showing what WOULD happen\n')

  try {
    // Connect to Paseo Asset Hub
    const provider = new WsProvider(PASEO_RPC)
    const api = await ApiPromise.create({ provider })

    const keyring = new Keyring({ type: 'sr25519' })
    const account = keyring.addFromMnemonic(MNEMONIC)

    console.log(`   Connected to Paseo Asset Hub`)
    console.log(`   Account: ${account.address}`)

    // Convert CID to contenthash format
    // Format: 0xe3 + 0x01 + CID bytes
    const cidBytes = Buffer.from(rootCID, 'utf8')
    const contenthash = '0xe301' + cidBytes.toString('hex')

    console.log(`\n   Domain Details:`)
    console.log(`   ─────────────────`)
    console.log(`   Name: ${DOMAIN_NAME}.dot`)
    console.log(`   CID: ${rootCID}`)
    console.log(`   Contenthash: ${contenthash.slice(0, 20)}...`)
    console.log(`   Access URL: https://${DOMAIN_NAME}.paseo.li`)

    console.log(`\n   ⚠️  Phase 2B: DotNS contract calls (not yet implemented)`)
    console.log(`   📝 TODO:`)
    console.log(`      1. Call DOTNS_REGISTRAR_CONTROLLER.commit()`)
    console.log(`      2. Wait for commit delay`)
    console.log(`      3. Call DOTNS_REGISTRAR_CONTROLLER.register()`)
    console.log(`      4. Call DOTNS_CONTENT_RESOLVER.setContenthash()`)

    await api.disconnect()

    return true
  } catch (error) {
    console.error('❌ Domain registration failed:', error.message)
    throw error
  }
}

// Summary
function printSummary(rootCID) {
  console.log('\n' + '='.repeat(70))
  console.log('📦 DEPLOYMENT SUMMARY')
  console.log('='.repeat(70))
  console.log(`\n✅ Built: ${BUILD_DIR}`)
  console.log(`✅ CAR file: ${CAR_OUTPUT}`)
  console.log(`✅ IPFS CID: ${rootCID}`)
  console.log(`\n🌐 Target domain: ${DOMAIN_NAME}.dot`)
  console.log(`🌍 Target URL: https://${DOMAIN_NAME}.paseo.li`)
  console.log('\n' + '─'.repeat(70))
  console.log('IMPLEMENTATION STATUS')
  console.log('─'.repeat(70))
  console.log('✅ Phase 1: Build + CAR creation')
  console.log('⏭️  Phase 2: Bulletin upload (BLOCKED - needs governance authorization)')
  console.log('⏭️  Phase 3: DotNS registration (TODO - needs contract integration)')
  console.log('\n' + '─'.repeat(70))
  console.log('WHY BULLETIN IS BLOCKED')
  console.log('─'.repeat(70))
  console.log('Bulletin requires authorization before storing content:')
  console.log('• Option 1: transactionStorage.authorize_account (root call)')
  console.log('• Option 2: transactionStorage.authorize_preimage via PoP bridge')
  console.log('\nWithout authorization, transactionStorage.store() will fail.')
  console.log('This is by design to prevent spam on the Bulletin chain.')
  console.log('\n' + '─'.repeat(70))
  console.log('NEXT STEPS')
  console.log('─'.repeat(70))
  console.log('\n1. IMMEDIATE (Can do now):')
  console.log('   • Deploy to IPFS gateway with existing CID')
  console.log('   • Implement DotNS contract integration (Paseo Asset Hub)')
  console.log('   • Test domain registration + contenthash setting')
  console.log('\n2. FUTURE (Requires authorization):')
  console.log('   • Get governance approval for test account authorization OR')
  console.log('   • Integrate PoP chain bridge for preimage authorization')
  console.log('   • Implement TransactionStorage.store with chunking')
  console.log('\n3. ALTERNATIVE (Bypass Bulletin for now):')
  console.log('   • Use public IPFS gateways (ipfs.io, dweb.link)')
  console.log('   • Pin content to Pinata/Web3.Storage')
  console.log('   • Set DotNS contenthash to IPFS CID directly')
  console.log('\n' + '─'.repeat(70))
  console.log('IPFS GATEWAY ACCESS')
  console.log('─'.repeat(70))
  console.log(`Your content is ready to be served from any IPFS gateway:`)
  console.log(`• https://ipfs.io/ipfs/${rootCID}`)
  console.log(`• https://dweb.link/ipfs/${rootCID}`)
  console.log(`• https://cloudflare-ipfs.com/ipfs/${rootCID}`)
  console.log('\n' + '='.repeat(70) + '\n')
}

// Main execution
async function main() {
  try {
    validateEnvironment()

    const buildSuccess = await buildApp()
    if (!buildSuccess) {
      console.error('\n❌ Deployment aborted due to build failure')
      process.exit(1)
    }

    const { rootCID, carPath, carSize } = await createCARFile()

    await skipBulletinUpload(rootCID)

    await registerDomain(rootCID)

    printSummary(rootCID)

  } catch (error) {
    console.error('\n❌ Deployment failed:', error)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

main()
