import { createPublicClient, http, keccak256 } from 'viem'
import { decodeAddress } from '@polkadot/util-crypto'

const PERSONHOOD_PRECOMPILE = '0x000000000000000000000000000000000a010000' as `0x${string}`

// "dotns" padded to 32 bytes — the context used by DotNS and bulletin-deploy
const DOTNS_CONTEXT = '0x646f746e73000000000000000000000000000000000000000000000000000000' as `0x${string}`

const PERSONHOOD_ABI = [
  {
    name: 'personhoodStatus',
    type: 'function',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'context', type: 'bytes32' },
    ],
    outputs: [
      { name: 'status', type: 'uint8' },
      { name: 'contextAlias', type: 'bytes32' },
    ],
    stateMutability: 'view',
  },
] as const

// Derive H160 from SS58 via keccak256(AccountId32)[-20:] — same as pallet_revive mapping
function ss58ToH160(ss58Address: string): `0x${string}` {
  const accountId = decodeAddress(ss58Address)
  const hash = keccak256(accountId)
  return `0x${hash.slice(-40)}` as `0x${string}`
}

/**
 * Query Proof of Personhood level for a Substrate account.
 * Calls the personhood precompile on Asset Hub EVM.
 * Status 2 = Full, 1 = Lite, 0 = NoStatus.
 */
export async function queryPopStatus(
  ss58Address: string,
  evmRpcUrl: string
): Promise<'full' | 'light' | null> {
  try {
    const h160 = ss58ToH160(ss58Address)
    const client = createPublicClient({ transport: http(evmRpcUrl) })
    const [status] = await client.readContract({
      address: PERSONHOOD_PRECOMPILE,
      abi: PERSONHOOD_ABI,
      functionName: 'personhoodStatus',
      args: [h160, DOTNS_CONTEXT],
    })
    if (status === 2) return 'full'
    if (status === 1) return 'light'
    return null
  } catch {
    return null
  }
}
