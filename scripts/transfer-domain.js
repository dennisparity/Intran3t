import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import dotenv from 'dotenv'

dotenv.config()

// Paseo Asset Hub configuration
const paseoAssetHub = {
  id: 420420417,
  name: 'Paseo Asset Hub',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 10 },
  rpcUrls: {
    default: { http: ['https://services.polkadothub-rpc.com/testnet'] }
  }
}

// Contract addresses
const DOTNS_REGISTRAR = '0x329aAA5b6bEa94E750b2dacBa74Bf41291E6c2BD'

// Domain node hash for intran3t-app42.dot
const DOMAIN_NODE = '0xc8200b93b92f94d9390f20d0177d7821101b4d3e6681b1a757bb944fb75dfe73'

// ERC-721 safeTransferFrom ABI
const ERC721_ABI = [
  {
    name: 'safeTransferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: []
  }
]

async function transferDomain(toAddress) {
  console.log('\n🔄 Transferring Domain Ownership')
  console.log('============================================================\n')

  // Create account from mnemonic
  const mnemonic = process.env.DOTNS_MNEMONIC
  if (!mnemonic) {
    throw new Error('DOTNS_MNEMONIC not found in .env')
  }

  const account = mnemonicToAccount(mnemonic)
  console.log(`From: ${account.address}`)
  console.log(`To: ${toAddress}`)
  console.log(`Domain: intran3t-app42.dot`)
  console.log(`Token ID: ${DOMAIN_NODE}\n`)

  // Create clients
  const publicClient = createPublicClient({
    chain: paseoAssetHub,
    transport: http()
  })

  const walletClient = createWalletClient({
    account,
    chain: paseoAssetHub,
    transport: http()
  })

  // Call safeTransferFrom
  console.log('Submitting transfer transaction...')
  const hash = await walletClient.writeContract({
    address: DOTNS_REGISTRAR,
    abi: ERC721_ABI,
    functionName: 'safeTransferFrom',
    args: [account.address, toAddress, BigInt(DOMAIN_NODE)]
  })

  console.log(`Transaction: ${hash}`)
  console.log('Waiting for confirmation...')

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}`)
  console.log(`Block: ${receipt.blockNumber}`)

  console.log('\n✨ Domain ownership transferred successfully!')
  console.log(`New owner: ${toAddress}`)
}

// Get target address from command line
const toAddress = process.argv[2]
if (!toAddress) {
  console.error('Usage: node transfer-domain.js <to-address>')
  process.exit(1)
}

transferDomain(toAddress).catch(console.error)
