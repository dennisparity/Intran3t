import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount, mnemonicToAccount } from 'viem/accounts'
import dotenv from 'dotenv'

dotenv.config()

const paseoAssetHub = {
  id: 420420417,
  name: 'Paseo Asset Hub',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 10 },
  rpcUrls: {
    default: { http: ['https://eth-rpc-testnet.polkadot.io'] }
  }
}

const RBAC_CONTRACT = process.env.VITE_RBAC_CONTRACT_ADDRESS
const ORG_ID = process.env.VITE_DEFAULT_ORG_ID

const RBAC_ABI = [
  {
    name: 'issueCredential',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'user', type: 'address' },
      { name: 'role', type: 'uint8' },
      { name: 'expiresAt', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'getUserRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'user', type: 'address' }
    ],
    outputs: [
      { name: 'role', type: 'uint8' },
      { name: 'hasRole', type: 'bool' }
    ]
  }
]

async function grantAdmin(newAdminAddress, privateKeyOrMnemonic) {
  console.log('\n👑 Granting Admin Role')
  console.log('============================================================\n')
  console.log(`Organization: ${ORG_ID}`)
  console.log(`New Admin: ${newAdminAddress}`)
  console.log(`RBAC Contract: ${RBAC_CONTRACT}\n`)

  // Check if it's a mnemonic (contains spaces) or private key (hex string)
  let account
  if (privateKeyOrMnemonic.includes(' ')) {
    console.log('Using mnemonic...')
    account = mnemonicToAccount(privateKeyOrMnemonic)
  } else {
    console.log('Using private key...')
    account = privateKeyToAccount(privateKeyOrMnemonic)
  }
  console.log(`Granting from: ${account.address}\n`)

  const publicClient = createPublicClient({
    chain: paseoAssetHub,
    transport: http()
  })

  const walletClient = createWalletClient({
    account,
    chain: paseoAssetHub,
    transport: http()
  })

  // Check current role
  const [currentRole, hasRole] = await publicClient.readContract({
    address: RBAC_CONTRACT,
    abi: RBAC_ABI,
    functionName: 'getUserRole',
    args: [ORG_ID, newAdminAddress]
  })

  const roleNames = ['NoRole', 'Member', 'Admin']
  console.log('Current status:')
  console.log(`  Role: ${roleNames[currentRole]} (${currentRole})`)
  console.log(`  Has Role: ${hasRole}\n`)

  if (currentRole === 2 && hasRole) {
    console.log('✅ Already has Admin role!')
    return
  }

  // Issue Admin credential
  console.log('Issuing Admin credential...')
  const hash = await walletClient.writeContract({
    address: RBAC_CONTRACT,
    abi: RBAC_ABI,
    functionName: 'issueCredential',
    args: [
      ORG_ID,
      newAdminAddress,
      2, // Admin = 2
      0n // No expiration
    ]
  })

  console.log(`Transaction: ${hash}`)
  console.log('Waiting for confirmation...')

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}`)

  // Verify
  const [newRole, newHasRole] = await publicClient.readContract({
    address: RBAC_CONTRACT,
    abi: RBAC_ABI,
    functionName: 'getUserRole',
    args: [ORG_ID, newAdminAddress]
  })

  console.log('\n✨ Admin role granted!')
  console.log(`  Role: ${roleNames[newRole]} (${newRole})`)
  console.log(`  Has Role: ${newHasRole}`)
}

const newAdminAddress = process.argv[2]
const privateKeyOrMnemonic = process.argv[3]

if (!newAdminAddress || !privateKeyOrMnemonic) {
  console.error('Usage: node grant-admin-viem.js <new-admin-address> <private-key-or-mnemonic>')
  console.error('\nExample with private key: node grant-admin-viem.js 0x... 0x...')
  console.error('Example with mnemonic: node grant-admin-viem.js 0x... "word1 word2 ... word12"')
  process.exit(1)
}

grantAdmin(newAdminAddress, privateKeyOrMnemonic).catch(console.error)
