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
const TARGET = '0xed041713db3374bac7b4963c574739fdc5da3604'

const RBAC_ABI = [
  {
    name: 'getCredential',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'user', type: 'address' }
    ],
    outputs: [{
      components: [
        { name: 'id', type: 'bytes32' },
        { name: 'orgId', type: 'bytes32' },
        { name: 'subject', type: 'address' },
        { name: 'role', type: 'uint8' },
        { name: 'issuedBy', type: 'address' },
        { name: 'issuedAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' },
        { name: 'revoked', type: 'bool' }
      ],
      type: 'tuple'
    }]
  }
]

const publicClient = createPublicClient({
  chain: paseoAssetHub,
  transport: http()
})

const cred = await publicClient.readContract({
  address: RBAC_CONTRACT,
  abi: RBAC_ABI,
  functionName: 'getCredential',
  args: [ORG_ID, TARGET]
})

const roleNames = ['Admin', 'Member', 'Viewer', 'PeopleCulture']

console.log('\n🔍 Credential Details')
console.log('============================================================\n')
console.log(`Subject: ${cred.subject}`)
console.log(`Role: ${roleNames[cred.role]} (${cred.role})`)
console.log(`Issued By: ${cred.issuedBy}`)
console.log(`Issued At: ${new Date(Number(cred.issuedAt) * 1000).toISOString()}`)
console.log(`Expires At: ${cred.expiresAt === 0n ? 'Never' : new Date(Number(cred.expiresAt) * 1000).toISOString()}`)
console.log(`Revoked: ${cred.revoked}`)
console.log(`\n${cred.revoked ? '❌ Credential is REVOKED' : '✅ Credential is ACTIVE'}`)
