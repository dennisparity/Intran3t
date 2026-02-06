/**
 * Check if a Substrate account is mapped to an EVM address
 * Usage: node check-mapping.js <substrate-address>
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { encodeAddress, decodeAddress } from '@polkadot/util-crypto'
import { keccak256 } from 'viem'

const RPC_ENDPOINT = 'wss://services.polkadothub-rpc.com/testnet'

/**
 * Derives the fallback EVM address from a Substrate SS58 address
 */
function deriveEvmAddress(ss58Address) {
  try {
    const decoded = decodeAddress(ss58Address)
    const hash = keccak256(decoded)
    return '0x' + hash.slice(-40) // Last 20 bytes
  } catch (error) {
    console.error('Failed to derive EVM address:', error)
    throw error
  }
}

async function checkMapping(substrateAddress) {
  console.log('\n🔍 Checking Account Mapping Status\n')
  console.log(`Substrate address: ${substrateAddress}`)

  // Connect to Polkadot Hub TestNet
  console.log('\nConnecting to Polkadot Hub TestNet...')
  const provider = new WsProvider(RPC_ENDPOINT)
  const api = await ApiPromise.create({ provider })

  try {
    // Derive the fallback EVM address
    const evmAddress = deriveEvmAddress(substrateAddress)
    console.log(`Derived EVM address: ${evmAddress}`)

    // Query pallet_revive.OriginalAccount storage
    const mappedAccount = await api.query.revive.originalAccount(evmAddress)

    if (mappedAccount.isSome) {
      const accountId = mappedAccount.unwrap()
      const ss58 = encodeAddress(accountId, 0) // Polkadot network prefix

      console.log('\n✅ Account is MAPPED!')
      console.log(`Mapped to: ${ss58}`)

      if (ss58 === substrateAddress) {
        console.log('✅ Mapping is correct (matches input address)')
      } else {
        console.log('⚠️  Mapping points to a different account!')
        console.log(`   Expected: ${substrateAddress}`)
        console.log(`   Found: ${ss58}`)
      }
    } else {
      console.log('\n❌ Account is NOT mapped')
      console.log('\nTo map your account:')
      console.log('1. Connect with Talisman/SubWallet in the dApp')
      console.log('2. Click "Map Account" button in the Acc3ss module')
      console.log('3. Sign the transaction in your wallet')
      console.log('\nOr use Polkadot.js API:')
      console.log('```js')
      console.log('const tx = api.tx.revive.mapAccount()')
      console.log('await tx.signAndSend(account)')
      console.log('```')
    }
  } finally {
    await api.disconnect()
  }
}

// Main execution
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('\n❌ Error: No address provided')
  console.error('\nUsage: node check-mapping.js <substrate-address>')
  console.error('Example: node check-mapping.js 15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5')
  process.exit(1)
}

const substrateAddress = args[0]

checkMapping(substrateAddress)
  .then(() => {
    console.log('\n✅ Check complete\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
