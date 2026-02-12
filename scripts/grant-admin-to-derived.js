import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
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
const NEW_ADMIN = '0xed041713db3374bac7b4963c574739fdc5da3604' // Derived address

const RBAC_ABI = [
  {
    name: 'issueCredential',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'subject', type: 'address' },
      { name: 'role', type: 'uint8' },
      { name: 'expiresAt', type: 'uint256' }
    ],
    outputs: [{ name: 'credentialId', type: 'bytes32' }]
  },
  {
    name: 'updateRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'subject', type: 'address' },
      { name: 'newRole', type: 'uint8' }
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

async function grantAdmin(privateKey) {
  console.log('\n👑 Granting Admin Role to Derived Address')
  console.log('============================================================\n')
  console.log(`Organization: ${ORG_ID}`)
  console.log(`New Admin (derived): ${NEW_ADMIN}`)
  console.log(`RBAC Contract: ${RBAC_CONTRACT}\n`)

  const account = privateKeyToAccount(privateKey)
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

  // Check sender's role first
  const [senderRole, senderHasRole] = await publicClient.readContract({
    address: RBAC_CONTRACT,
    abi: RBAC_ABI,
    functionName: 'getUserRole',
    args: [ORG_ID, account.address]
  })

  const roleNames = ['Admin', 'Member', 'Viewer', 'PeopleCulture']
  console.log('Sender status:')
  console.log(`  Role: ${roleNames[senderRole]} (${senderRole})`)
  console.log(`  Has Role: ${senderHasRole}`)

  if (!senderHasRole || senderRole !== 0) {
    console.error('\n❌ Error: Your account does not have active Admin permissions!')
    console.error('Your credential may be revoked or expired.')
    process.exit(1)
  }
  console.log('  ✅ Sender has active Admin role\n')

  // Check target's current role
  const [currentRole, hasRole] = await publicClient.readContract({
    address: RBAC_CONTRACT,
    abi: RBAC_ABI,
    functionName: 'getUserRole',
    args: [ORG_ID, NEW_ADMIN]
  })

  console.log('Target status:')
  console.log(`  Role: ${roleNames[currentRole]} (${currentRole})`)
  console.log(`  Has Role: ${hasRole}\n`)

  if (currentRole === 0 && hasRole) {
    console.log('✅ Already has active Admin role!')
    return
  }

  // Use updateRole for active credentials, issueCredential for revoked/missing ones
  const useUpdate = hasRole && currentRole > 0
  const functionName = useUpdate ? 'updateRole' : 'issueCredential'

  if (currentRole > 0 && !hasRole) {
    console.log('  ⚠️  Credential is revoked - will overwrite with new credential')
  }

  console.log(`${useUpdate ? 'Updating' : 'Issuing'} Admin role...`)

  const args = useUpdate
    ? [ORG_ID, NEW_ADMIN, 0] // updateRole: orgId, subject, newRole (0 = Admin)
    : [ORG_ID, NEW_ADMIN, 0, 0n] // issueCredential: orgId, subject, role, expiresAt (0 = Admin)

  const hash = await walletClient.writeContract({
    address: RBAC_CONTRACT,
    abi: RBAC_ABI,
    functionName,
    args
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
    args: [ORG_ID, NEW_ADMIN]
  })

  console.log('\n✨ Admin role granted!')
  console.log(`  Role: ${roleNames[newRole]} (${newRole})`)
  console.log(`  Has Role: ${newHasRole}`)
}

let privateKey = process.argv[2]

if (!privateKey) {
  console.error('Usage: node scripts/grant-admin-to-derived.js <private-key>')
  console.error('Example: node scripts/grant-admin-to-derived.js 0x... or abc123...')
  process.exit(1)
}

// Add 0x prefix if missing
if (!privateKey.startsWith('0x')) {
  privateKey = '0x' + privateKey
}

grantAdmin(privateKey).catch(console.error)
