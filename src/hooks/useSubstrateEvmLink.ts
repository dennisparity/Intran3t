/**
 * useSubstrateEvmLink Hook
 *
 * Links Substrate accounts to their corresponding EVM addresses in the same wallet.
 * Stores and retrieves these mappings from localStorage.
 *
 * This is necessary because Polkadot wallets (Talisman, SubWallet) use separate
 * keypairs for Substrate and EVM, not the Polkadot truncation method.
 */

import { useState, useEffect, useCallback } from 'react'

interface SubstrateEvmMapping {
  substrateAddress: string
  evmAddress: string
  walletName?: string
  linkedAt: string
  lastUsed: string
}

const STORAGE_KEY = 'intran3t_substrate_evm_mappings'

/**
 * Load mappings from localStorage
 */
function loadMappings(): SubstrateEvmMapping[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save mappings to localStorage
 */
function saveMappings(mappings: SubstrateEvmMapping[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
  } catch (error) {
    console.error('Failed to save Substrate-EVM mappings:', error)
  }
}

export function useSubstrateEvmLink() {
  const [mappings, setMappings] = useState<SubstrateEvmMapping[]>(loadMappings())

  /**
   * Get EVM address for a Substrate address
   */
  const getEvmAddress = useCallback((substrateAddress: string): string | null => {
    const mapping = mappings.find(m => m.substrateAddress === substrateAddress)
    return mapping?.evmAddress || null
  }, [mappings])

  /**
   * Get Substrate address for an EVM address
   */
  const getSubstrateAddress = useCallback((evmAddress: string): string | null => {
    const mapping = mappings.find(m =>
      m.evmAddress.toLowerCase() === evmAddress.toLowerCase()
    )
    return mapping?.substrateAddress || null
  }, [mappings])

  /**
   * Link a Substrate address to an EVM address
   */
  const linkAddresses = useCallback((
    substrateAddress: string,
    evmAddress: string,
    walletName?: string
  ) => {
    setMappings(prev => {
      // Remove existing mapping for this substrate address
      const filtered = prev.filter(m => m.substrateAddress !== substrateAddress)

      // Add new mapping
      const newMapping: SubstrateEvmMapping = {
        substrateAddress,
        evmAddress,
        walletName,
        linkedAt: prev.find(m => m.substrateAddress === substrateAddress)?.linkedAt || new Date().toISOString(),
        lastUsed: new Date().toISOString()
      }

      const updated = [...filtered, newMapping]
      saveMappings(updated)
      return updated
    })

    console.log('🔗 Linked addresses:')
    console.log('   Substrate:', substrateAddress)
    console.log('   EVM:', evmAddress)
    if (walletName) console.log('   Wallet:', walletName)
  }, [])

  /**
   * Update last used timestamp
   */
  const updateLastUsed = useCallback((substrateAddress: string) => {
    setMappings(prev => {
      const updated = prev.map(m =>
        m.substrateAddress === substrateAddress
          ? { ...m, lastUsed: new Date().toISOString() }
          : m
      )
      saveMappings(updated)
      return updated
    })
  }, [])

  /**
   * Remove a mapping
   */
  const unlinkAddresses = useCallback((substrateAddress: string) => {
    setMappings(prev => {
      const updated = prev.filter(m => m.substrateAddress !== substrateAddress)
      saveMappings(updated)
      return updated
    })
  }, [])

  /**
   * Check if addresses are linked
   */
  const areLinked = useCallback((substrateAddress: string, evmAddress: string): boolean => {
    return mappings.some(m =>
      m.substrateAddress === substrateAddress &&
      m.evmAddress.toLowerCase() === evmAddress.toLowerCase()
    )
  }, [mappings])

  return {
    mappings,
    getEvmAddress,
    getSubstrateAddress,
    linkAddresses,
    unlinkAddresses,
    updateLastUsed,
    areLinked
  }
}
