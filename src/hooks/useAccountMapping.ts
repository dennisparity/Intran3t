import { useEffect, useState } from 'react'
import { useWallet } from '../providers/WalletProvider'
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
const MAPPING_CACHE_KEY = (address: string) => `intran3t_mapped_${address}`

export function useAccountMapping(substrateAddress?: string) {
  const { apiClient, selectedAccount, signer } = useWallet()
  // Seed from localStorage so mapped accounts are immediately recognised on load
  const [isMapped, setIsMapped] = useState<boolean | null>(() => {
    if (!substrateAddress) return null
    return localStorage.getItem(MAPPING_CACHE_KEY(substrateAddress)) === 'true' ? true : null
  })
  const [evmAddress, setEvmAddress] = useState<`0x${string}` | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!substrateAddress || !apiClient) {
      setIsMapped(null)
      setEvmAddress(null)
      return
    }

    // If already confirmed via localStorage, skip chain check
    if (localStorage.getItem(MAPPING_CACHE_KEY(substrateAddress)) === 'true') {
      try { setEvmAddress(deriveEvmAddress(substrateAddress)) } catch {}
      setIsMapped(true)
      return
    }

    let isMounted = true

    const checkMapping = async () => {
      try {
        setIsLoading(true)

        const derived = deriveEvmAddress(substrateAddress)
        if (isMounted) setEvmAddress(derived)

        const result = await apiClient.query.Revive.OriginalAccount.getValue(derived)

        if (isMounted) {
          const mapped = result !== null
          setIsMapped(mapped)
          if (mapped) localStorage.setItem(MAPPING_CACHE_KEY(substrateAddress), 'true')
          console.log('🗺️ Account mapping check:', { substrateAddress, derivedEvmAddress: derived, isMapped: mapped })
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Incompatible runtime entry')) {
          console.warn('⚠️ Account mapping check unavailable (chain metadata mismatch)')
          if (isMounted) setIsMapped(null)
        } else {
          console.error('Failed to check account mapping:', error)
          if (isMounted) setIsMapped(null)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    checkMapping()

    return () => { isMounted = false }
  }, [substrateAddress, apiClient])

  /**
   * Creates an on-chain mapping between the Substrate account and its derived EVM address
   * Requires user to sign transaction in wallet
   */
  const mapAccount = async () => {
    if (!apiClient || !selectedAccount?.address) {
      throw new Error('API client or selected account not available')
    }

    try {
      console.log('🗺️ Initiating account mapping...')

      // Create the map_account transaction
      const tx = apiClient.tx.Revive.map_account({})

      // Sign and submit the transaction using Product SDK signer
      if (!signer) {
        throw new Error('Signer not available. Please ensure your wallet is connected.')
      }
      // Use subscribe pattern to properly detect on-chain success/failure
      await new Promise<void>((resolve, reject) => {
        tx.signSubmitAndWatch(signer).subscribe({
          next: (event: any) => {
            console.log(`🗺️ map_account event: ${event.type}`)
            if (event.type === 'finalized') {
              if (event.ok) {
                resolve()
              } else {
                const errEvents = (event.events || [])
                  .filter((e: any) => e.type === 'System' && e.value?.type === 'ExtrinsicFailed')
                const detail = errEvents.length > 0 ? JSON.stringify(errEvents[0].value) : 'unknown'
                reject(new Error(`map_account failed on-chain: ${detail}`))
              }
            }
          },
          error: (err: any) => reject(err)
        })
      })

      console.log('✅ Account mapping successful!')

      // Cache and update state
      if (selectedAccount?.address) {
        localStorage.setItem(MAPPING_CACHE_KEY(selectedAccount.address), 'true')
      }
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
