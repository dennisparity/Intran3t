/**
 * Substrate EVM Signer Hook
 *
 * Provides EVM-compatible signing using Substrate wallets via pallet_revive.
 * Allows Substrate accounts (after mapping) to sign EVM transactions without MetaMask.
 *
 * Flow:
 * 1. User connects Substrate wallet (Talisman, SubWallet, etc.)
 * 2. Account is mapped via pallet_revive.map_account()
 * 3. EVM transactions are signed with Substrate wallet
 * 4. Transactions submitted via pallet_revive to EVM layer
 */

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../providers/WalletProvider'
import { keccak256, hexToBytes } from 'viem'
import { decodeAddress } from '@polkadot/util-crypto'
import { Binary } from 'polkadot-api'

interface SubstrateEVMSignerReturn {
  // Derived/mapped EVM address
  evmAddress: `0x${string}` | null

  // Whether account is mapped on-chain
  isMapped: boolean | null

  // Sign and send EVM transaction
  sendTransaction: (txData: {
    to: string
    data: string
    value?: bigint
    gasLimit?: bigint
  }) => Promise<string> // returns tx hash

  // Loading states
  isLoading: boolean
  error: string | null
}

/**
 * Derives EVM address from Substrate SS58 address
 * Formula: keccak256(AccountId32) -> last 20 bytes
 */
function deriveEvmAddress(ss58Address: string): `0x${string}` {
  const decoded = decodeAddress(ss58Address)
  const hash = keccak256(decoded)
  return ('0x' + hash.slice(-40)) as `0x${string}`
}

/**
 * Hook to provide EVM signing capabilities using Substrate wallet
 */
export function useSubstrateEVMSigner(): SubstrateEVMSignerReturn {
  // Use Product SDK wallet provider - signer comes from connectInjectedExtension
  const { selectedAccount, apiClient, signer } = useWallet()
  const [evmAddress, setEvmAddress] = useState<`0x${string}` | null>(null)
  const [isMapped, setIsMapped] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derive EVM address (skip on-chain mapping check)
  useEffect(() => {
    console.log('🔍 SubstrateEVMSigner - checking conditions:', {
      hasAccount: !!selectedAccount?.address,
      address: selectedAccount?.address
    })

    if (!selectedAccount?.address) {
      setEvmAddress(null)
      setIsMapped(false)
      return
    }

    try {
      // Derive EVM address from Substrate address
      const derived = deriveEvmAddress(selectedAccount.address)
      setEvmAddress(derived)

      // Assume mapped (will fail at transaction time if not)
      setIsMapped(true)

      console.log('🔗 Substrate EVM Signer:', {
        substrateAddress: selectedAccount.address,
        derivedEvmAddress: derived,
        note: 'Mapping check skipped - assuming account is mapped'
      })
    } catch (err) {
      console.error('Failed to derive EVM address:', err)
      setIsMapped(false)
      setError('Failed to derive EVM address')
    }
  }, [selectedAccount?.address])

  /**
   * Send EVM transaction using Substrate wallet
   *
   * This submits the transaction via pallet_revive.eth_transact() which:
   * 1. Validates the sender is the mapped account
   * 2. Executes the EVM transaction
   * 3. Returns the transaction hash
   */
  const sendTransaction = useCallback(async (txData: {
    to: string
    data: string
    value?: bigint
    gasLimit?: bigint
  }): Promise<string> => {
    console.log('🔍 sendTransaction - debugging:', {
      hasApiClient: !!apiClient,
      hasSelectedAccount: !!selectedAccount,
      accountAddress: selectedAccount?.address,
      hasSigner: !!signer,
      signerType: typeof signer
    })

    if (!apiClient) {
      throw new Error('API client not initialized - please connect wallet')
    }

    if (!selectedAccount?.address) {
      throw new Error('No account selected - please connect wallet')
    }

    if (!signer) {
      throw new Error('Signer not available - please ensure wallet is connected')
    }

    if (!evmAddress) {
      throw new Error('EVM address not derived')
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('📤 Sending EVM transaction via Substrate:', {
        from: evmAddress,
        to: txData.to,
        data: txData.data,
        value: txData.value?.toString(),
        gasLimit: txData.gasLimit?.toString()
      })

      // Submit via pallet_revive.call
      // This extrinsic allows mapped accounts to execute EVM transactions
      // CRITICAL: Convert hex strings to Binary objects for PAPI encoding
      const destBytes = hexToBytes(txData.to as `0x${string}`)
      const dataBytes = hexToBytes(txData.data as `0x${string}`)

      console.log('📋 Transaction parameters:', {
        destHex: txData.to,
        destBytes: destBytes,
        destBytesLength: destBytes?.length,
        dataHex: txData.data.substring(0, 66) + '...',
        dataBytes: dataBytes,
        dataBytesLength: dataBytes?.length,
        value: txData.value || 0n
      })

      const tx = apiClient.tx.Revive.call({
        dest: Binary.fromBytes(destBytes),
        value: txData.value || 0n,
        // CRITICAL: Direct Revive uses 'weight_limit' not 'gas_limit'
        // Pattern from hackm3: { ref_time: bigint, proof_size: bigint }
        weight_limit: {
          ref_time: 500_000_000_000n,  // 500 billion (standard for contract calls)
          proof_size: 2_000_000n        // 2MB proof size
        },
        storage_deposit_limit: 10_000_000_000_000n,  // 10 trillion (standard limit)
        data: Binary.fromBytes(dataBytes)
      })

      console.log('📋 Transaction object created:', tx)

      // Sign and submit with Substrate wallet using Typink's signer
      console.log('⏳ Signing and submitting transaction...')
      console.log('📋 Signer:', signer)
      console.log('📋 Signer keys:', signer ? Object.keys(signer) : 'empty')

      // Use subscribe pattern to capture transaction hash from events
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Transaction timed out after 2 minutes'))
        }, 120_000)

        let txHash: string | null = null

        tx.signSubmitAndWatch(signer).subscribe({
          next: (event: any) => {
            console.log(`📋 Transaction event: ${event.type}`)

            // Try to extract hash from various event types
            if (event.type === 'broadcasted' || event.type === 'txBestBlocksState') {
              // Hash might be available in early events
              if (event.txHash) txHash = event.txHash
              if (event.hash) txHash = event.hash
            }

            if (event.type === 'finalized') {
              clearTimeout(timeout)
              if (event.ok) {
                console.log('✅ Transaction finalized successfully!')
                // Use hash if we captured it, otherwise 'finalized-no-hash'
                resolve(txHash || 'finalized-no-hash')
              } else {
                console.error('❌ Transaction finalized but failed')
                reject(new Error('Transaction finalized but marked as failed'))
              }
            } else if (event.type === 'invalid') {
              clearTimeout(timeout)
              console.error('❌ Transaction marked as invalid')
              reject(new Error('Transaction marked as invalid'))
            }
          },
          error: (err: any) => {
            clearTimeout(timeout)
            console.error('❌ Transaction subscription error:', err)
            reject(err)
          }
        })
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed'
      console.error('❌ Transaction failed:', err)
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, selectedAccount, signer, isMapped, evmAddress])

  return {
    evmAddress,
    isMapped,
    sendTransaction,
    isLoading,
    error
  }
}
