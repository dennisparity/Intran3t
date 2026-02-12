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
    name: 'getOrganization',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'orgId', type: 'bytes32' }],
    outputs: [{
      components: [
        { name: 'id', type: 'bytes32' },
        { name: 'name', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'memberCount', type: 'uint32' },
        { name: 'exists', type: 'bool' }
      ],
      type: 'tuple'
    }]
  }
]

const publicClient = createPublicClient({
  chain: paseoAssetHub,
  transport: http()
})

const org = await publicClient.readContract({
  address: RBAC_CONTRACT,
  abi: RBAC_ABI,
  functionName: 'getOrganization',
  args: [ORG_ID]
})

console.log('\n📋 Organization Details')
console.log('============================================================\n')
console.log('Raw result:', org)
console.log(`\nName: ${org.name || org[1]}`)
console.log(`Owner: ${org.owner || org[2]}`)
console.log(`Member Count: ${org.memberCount || org[4]}`)
console.log(`Exists: ${org.exists || org[5]}`)
console.log('\nThe owner account has Admin permissions and can grant roles.')
