/**
 * Substrate EVM Signer Hook
 *
 * Provides EVM-compatible signing via pallet_revive using the Substrate signer from WalletProvider.
 * evmAddress and isMapped come from WalletProvider — no duplicate chain queries here.
 */

import { useState, useCallback } from 'react'
import { useWallet } from '../providers/WalletProvider'
import { hexToBytes } from 'viem'
import { Binary } from '@polkadot-api/substrate-bindings'

interface SubstrateEVMSignerReturn {
  evmAddress: `0x${string}` | null
  isMapped: boolean | null
  sendTransaction: (txData: {
    to: string
    data: string
    value?: bigint
    gasLimit?: bigint
    onProgress?: (stage: 'broadcasted' | 'in_block') => void
  }) => Promise<string>
  isLoading: boolean
  error: string | null
}

export function useSubstrateEVMSigner(): SubstrateEVMSignerReturn {
  const { selectedAccount, apiClient, unsafeApiClient, signer, evmAddress, isMapped } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendTransaction = useCallback(async (txData: {
    to: string
    data: string
    value?: bigint
    gasLimit?: bigint
    onProgress?: (stage: 'broadcasted' | 'in_block') => void
  }): Promise<string> => {
    if (!apiClient) throw new Error('API client not initialized — please connect wallet')
    if (!selectedAccount?.address) throw new Error('No account selected — please connect wallet')
    if (!signer) throw new Error('Signer not available — please connect wallet')
    if (!evmAddress) throw new Error('EVM address not derived')

    setIsLoading(true)
    setError(null)

    try {
      const dataBytes = hexToBytes(txData.data as `0x${string}`)
      const txApi = unsafeApiClient || apiClient
      const tx = txApi.tx.Revive.call({
        dest: txData.to,
        value: txData.value || 0n,
        weight_limit: {
          ref_time: 500_000_000_000n,
          proof_size: 2_000_000n,
        },
        storage_deposit_limit: 10_000_000_000_000n,
        data: Binary.fromBytes(dataBytes) as any,
      })

      // mortal: true required — Polkadot Desktop (Spektr) silently drops immortal sign requests
      return new Promise<string>((resolve, reject) => {
        let settled = false

        const safeStr = (obj: any) =>
          JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))

        const sub = tx.signSubmitAndWatch(signer, {
          mortality: { mortal: true, period: 256 },
        }).subscribe({
          next: (event: any) => {
            if (settled) return

            if (event.type === 'broadcasted' && event.txHash) {
              txData.onProgress?.('broadcasted')
            }

            if (event.type === 'txBestBlocksState' && event.found) {
              const failed = event.events?.find(
                (e: any) => e.type === 'System' && e.value?.type === 'ExtrinsicFailed'
              )
              if (failed) {
                settled = true
                sub.unsubscribe()
                reject(new Error(`Transaction failed on-chain: ${safeStr(failed.value?.value ?? failed.value)}`))
                return
              }
              if (event.ok) {
                settled = true
                sub.unsubscribe()
                txData.onProgress?.('in_block')
                resolve(event.txHash || 'in-block-no-hash')
              }
            }
          },
          error: (err: any) => {
            if (settled) return
            settled = true
            reject(err)
          },
        })
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, unsafeApiClient, selectedAccount, signer, evmAddress])

  return { evmAddress, isMapped, sendTransaction, isLoading, error }
}
