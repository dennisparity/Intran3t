import { useEffect, useState } from 'react'
import { useTypink } from 'typink'
import { decodeAddress } from '@polkadot/util-crypto'
import { keccak256 } from 'viem'

/**
 * Derives the fallback EVM address from a Substrate SS58 address
 * Formula: keccak256(AccountId32) -> last 20 bytes
 */
function deriveEvmAddress(ss58Address: string): `0x${string}` {
  try {
    const decoded = decodeAddress(ss58Address)
    const hash = keccak256(decoded)
    return ('0x' + hash.slice(-40)) as `0x${string}`
  } catch (error) {
    console.error('Failed to derive EVM address:', error)
    throw error
  }
}

/**
 * Hook to check if a Substrate account is mapped to an EVM address via pallet_revive
 *
 * @param substrateAddress - SS58-encoded Substrate address
 * @returns {
 *   isMapped: boolean | null - Whether account is mapped (null = loading/unavailable)
 *   evmAddress: string | null - Derived EVM address (fallback address)
 *   isLoading: boolean - Whether query is in progress
 *   mapAccount: () => Promise<void> - Function to trigger account mapping
 * }
 */
export function useAccountMapping(substrateAddress?: string) {
  const { apiClient, connectedAccount } = useTypink()
  const [isMapped, setIsMapped] = useState<boolean | null>(null)
  const [evmAddress, setEvmAddress] = useState<`0x${string}` | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!substrateAddress || !apiClient) {
      setIsMapped(null)
      setEvmAddress(null)
      return
    }

    let isMounted = true

    const checkMapping = async () => {
      try {
        setIsLoading(true)

        // Derive the fallback EVM address
        const derived = deriveEvmAddress(substrateAddress)
        if (isMounted) {
          setEvmAddress(derived)
        }

        // Query pallet_revive.OriginalAccount storage
        // If Some(accountId) -> account is mapped
        // If None -> account is not mapped
        const result = await apiClient.query.Revive.OriginalAccount.getValue(derived)

        if (isMounted) {
          setIsMapped(result !== null)
          console.log('🗺️ Account mapping check:', {
            substrateAddress,
            derivedEvmAddress: derived,
            isMapped: result !== null,
            mappedTo: result ? result.toString() : null
          })
        }
      } catch (error) {
        console.error('Failed to check account mapping:', error)
        if (isMounted) {
          setIsMapped(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkMapping()

    return () => {
      isMounted = false
    }
  }, [substrateAddress, apiClient])

  /**
   * Creates an on-chain mapping between the Substrate account and its derived EVM address
   * Requires user to sign transaction in wallet
   */
  const mapAccount = async () => {
    if (!apiClient || !connectedAccount?.polkadotSigner) {
      throw new Error('API client or signer not available')
    }

    try {
      console.log('🗺️ Initiating account mapping...')

      // Create the map_account transaction
      const tx = apiClient.tx.Revive.map_account({})

      // Sign the transaction
      const signed = await tx.signAsync(connectedAccount.polkadotSigner)

      // Submit and wait for inclusion
      await signed.submit()

      console.log('✅ Account mapping successful!')

      // Update state to reflect mapping
      setIsMapped(true)
    } catch (error) {
      console.error('❌ Account mapping failed:', error)
      throw error
    }
  }

  return {
    isMapped,
    evmAddress,
    isLoading,
    mapAccount
  }
}
