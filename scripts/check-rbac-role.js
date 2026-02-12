import { createPublicClient, http } from 'viem'
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
  },
  {
    name: 'getOrganization',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'orgId', type: 'bytes32' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'admin', type: 'address' },
      { name: 'exists', type: 'bool' }
    ]
  }
]

async function checkRole(userAddress) {
  console.log('\n🔍 Checking RBAC Role')
  console.log('============================================================\n')
  console.log(`Organization: ${ORG_ID}`)
  console.log(`User: ${userAddress}`)
  console.log(`RBAC Contract: ${RBAC_CONTRACT}\n`)

  const client = createPublicClient({
    chain: paseoAssetHub,
    transport: http()
  })

  // Check user role (skip org details due to decoding issues)
  const [role, hasRole] = await client.readContract({
    address: RBAC_CONTRACT,
    abi: RBAC_ABI,
    functionName: 'getUserRole',
    args: [ORG_ID, userAddress]
  })

  const roleNames = ['NoRole', 'Member', 'Admin']
  console.log('User Role:')
  console.log(`  Role: ${roleNames[role]} (${role})`)
  console.log(`  Has Role: ${hasRole}`)

  if (hasRole && (role === 1 || role === 2)) {
    console.log('\n✅ User has access (Member or Admin)')
  } else {
    console.log('\n❌ User does not have access')
  }

  // Check balance
  const balance = await client.getBalance({ address: userAddress })
  console.log(`\nWallet Balance: ${Number(balance) / 1e10} PAS`)

  if (balance === 0n) {
    console.log('⚠️  No balance! Get testnet tokens from https://faucet.polkadot.io/')
  }
}

const userAddress = process.argv[2]
if (!userAddress) {
  console.error('Usage: node check-rbac-role.js <user-address>')
  process.exit(1)
}

checkRole(userAddress).catch(console.error)
