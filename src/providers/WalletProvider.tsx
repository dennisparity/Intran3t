/**
 * Wallet Provider - React Context
 *
 * Replaces Typink with Product SDK integration
 * Provides wallet state and accounts to components
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from 'polkadot-api'
import { getWsProvider } from 'polkadot-api/ws-provider/web'
import type { InjectedPolkadotAccount, PolkadotSigner } from 'polkadot-api/pjs-signer'
import { getWalletExtension, isInHost, type WalletExtension } from '../lib/wallet-provider'
import { paseo } from '../../.papi/descriptors'
import { keccak256 } from 'viem'
import { decodeAddress } from '@polkadot/util-crypto'

const MAPPING_CACHE_KEY = (addr: string) => `intran3t_mapped_${addr}`

interface WalletContextValue {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  inHost: boolean

  // Accounts
  accounts: InjectedPolkadotAccount[]
  selectedAccount: InjectedPolkadotAccount | null

  // PAPI
  apiClient: any | null
  signer: PolkadotSigner | null

  // Account mapping — shared across all modules
  isMapped: boolean | null
  evmAddress: `0x${string}` | null
  mapAccount: () => Promise<void>
  resetMappingCache: () => void

  // Actions
  connect: (walletId?: string) => Promise<void>
  disconnect: () => void
  selectAccount: (address: string) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

const WALLET_STORAGE_KEY = 'intran3t_wallet_connected'
const ACCOUNT_STORAGE_KEY = 'intran3t_selected_account'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [extension, setExtension] = useState<WalletExtension | null>(null)
  const [accounts, setAccounts] = useState<InjectedPolkadotAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<InjectedPolkadotAccount | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [apiClient, setApiClient] = useState<any>(null)
  const [signer, setSigner] = useState<PolkadotSigner | null>(null)

  // Mapping state — single shared instance for all modules
  const [isMapped, setIsMapped] = useState<boolean | null>(null)
  const [evmAddress, setEvmAddress] = useState<`0x${string}` | null>(null)

  const inHost = isInHost()

  // Initialize PAPI client
  useEffect(() => {
    const initApi = async () => {
      try {
        const wsProvider = getWsProvider('wss://sys.ibp.network/asset-hub-paseo')
        const client = createClient(wsProvider)
        const api = client.getTypedApi(paseo)
        setApiClient(api)
        console.log('✅ PAPI client initialized')
      } catch (error) {
        console.error('Failed to initialize PAPI:', error)
      }
    }

    initApi()
  }, [])

  // Connect wallet
  const connect = useCallback(async (walletId?: string) => {
    if (isConnecting) return

    setIsConnecting(true)
    try {
      const ext = await getWalletExtension(walletId)
      if (ext) {
        setExtension(ext)
        setAccounts(ext.accounts)

        // Only auto-select if there's exactly ONE account
        if (ext.accounts.length === 1 && !selectedAccount) {
          const onlyAccount = ext.accounts[0]
          setSelectedAccount(onlyAccount)

          // Extract signer
          if ('polkadotSigner' in onlyAccount) {
            const accountSigner = (onlyAccount as any).polkadotSigner
            setSigner(accountSigner)
            console.log('✅ Auto-selected single account:', onlyAccount.address)
          }
        } else if (ext.accounts.length > 1) {
          console.log('🔍 Multiple accounts detected, waiting for user selection')
        }

        // Subscribe to account changes
        ext.subscribe((newAccounts) => {
          setAccounts(newAccounts)

          // Update selected account if it's no longer in the list
          if (selectedAccount && !newAccounts.find(a => a.address === selectedAccount.address)) {
            const newAccount = newAccounts[0] || null
            setSelectedAccount(newAccount)

            // Update signer
            if (newAccount && 'polkadotSigner' in newAccount) {
              setSigner((newAccount as any).polkadotSigner)
            } else {
              setSigner(null)
            }
          }
        })

        console.log('✅ Wallet connected:', ext.name)

        // Save connection state to localStorage
        localStorage.setItem(WALLET_STORAGE_KEY, 'true')
        // Note: Account address will be saved when user selects an account
      } else {
        console.warn('❌ No wallet available')
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, selectedAccount])

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setExtension(null)
    setAccounts([])
    setSelectedAccount(null)
    setSigner(null)
    localStorage.removeItem(WALLET_STORAGE_KEY)
    localStorage.removeItem(ACCOUNT_STORAGE_KEY)
    console.log('🔌 Wallet disconnected')
  }, [])

  // Select account and get signer
  const selectAccount = useCallback(async (address: string) => {
    const account = accounts.find(a => a.address === address)
    if (account) {
      setSelectedAccount(account)
      localStorage.setItem(ACCOUNT_STORAGE_KEY, address)

      // Get signer for this account from connectInjectedExtension
      // The account object has a polkadotSigner property
      if ('polkadotSigner' in account) {
        const accountSigner = (account as any).polkadotSigner
        setSigner(accountSigner)
        console.log('✅ Signer set for account:', address)
      } else {
        console.warn('⚠️ Account does not have polkadotSigner property')
        setSigner(null)
      }
    }
  }, [accounts])

  // Auto-reconnect on mount if previously connected.
  // Delay 500ms so browser extensions (Talisman, SubWallet) have time to inject
  // themselves into window.injectedWeb3 before we try to connect.
  useEffect(() => {
    const wasConnected = localStorage.getItem(WALLET_STORAGE_KEY)
    if (wasConnected === 'true' || inHost) {
      setIsReconnecting(true)
      console.log('🔄 Auto-reconnecting wallet...')
      const timer = setTimeout(() => {
        connect().finally(() => setIsReconnecting(false))
      }, 500)
      return () => clearTimeout(timer)
    }
  }, []) // Only run on mount

  // Restore selected account after accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      const savedAddress = localStorage.getItem(ACCOUNT_STORAGE_KEY)
      if (savedAddress) {
        const savedAccount = accounts.find(a => a.address === savedAddress)
        if (savedAccount) {
          selectAccount(savedAddress)
          console.log('✅ Restored account:', savedAddress)
        }
      }
    }
  }, [accounts, selectedAccount, selectAccount])

  // Derive EVM address and check mapping state when account or apiClient changes
  useEffect(() => {
    const address = selectedAccount?.address
    if (!address) {
      setIsMapped(null)
      setEvmAddress(null)
      return
    }

    // Derive EVM address (deterministic, local)
    let derived: `0x${string}` | null = null
    try {
      const decoded = decodeAddress(address)
      const hash = keccak256(decoded)
      derived = ('0x' + hash.slice(-40)) as `0x${string}`
      setEvmAddress(derived)
    } catch {
      setEvmAddress(null)
      return
    }

    // Fast path: localStorage cache
    if (localStorage.getItem(MAPPING_CACHE_KEY(address)) === 'true') {
      setIsMapped(true)
      return
    }

    // Background on-chain check — determines true mapping state
    // Sets isMapped = true/false so the banner only shows when confirmed unmapped
    if (!apiClient) return
    let cancelled = false

    apiClient.query.Revive.OriginalAccount.getValue(derived)
      .then((result: any) => {
        if (cancelled) return
        const mapped = result !== null
        setIsMapped(mapped)
        if (mapped) localStorage.setItem(MAPPING_CACHE_KEY(address), 'true')
        console.log('🗺️ On-chain mapping check:', { address, mapped })
      })
      .catch((err: any) => {
        if (cancelled) return
        // Metadata mismatch or unavailable — leave as null, no banner shown
        if (err?.message?.includes('Incompatible runtime entry')) {
          console.warn('⚠️ Revive.OriginalAccount unavailable (metadata mismatch) — mapping state unknown')
        } else {
          console.warn('⚠️ Could not check mapping state:', err?.message)
        }
      })

    return () => { cancelled = true }
  }, [selectedAccount?.address, apiClient])

  const mapAccount = useCallback(async () => {
    if (!apiClient || !selectedAccount?.address || !signer) {
      throw new Error('Wallet not connected')
    }
    console.log('🗺️ Initiating account mapping...')
    const tx = apiClient.tx.Revive.map_account({})
    await new Promise<void>((resolve, reject) => {
      let settled = false
      tx.signSubmitAndWatch(signer).subscribe({
        next: (event: any) => {
          console.log(`🗺️ map_account event: ${event.type}`)
          // Resolve on in-block success for fast UX (saves ~12s vs waiting for finalized)
          if (event.type === 'txBestBlocksState' && !settled) {
            if (event.found && event.ok) {
              settled = true
              console.log('✅ map_account in best block')
              resolve()
            } else if (event.found && !event.ok) {
              console.warn('⚠️ map_account in best block but not ok — waiting for finalized error details')
            }
            return
          }
          if (event.type === 'finalized') {
            if (settled) {
              console.log(`📋 map_account finalized (already resolved): ok=${event.ok}`)
              return
            }
            settled = true
            if (event.ok) {
              resolve()
            } else {
              const safeStr = (v: any) => JSON.stringify(v, (_k, x) => typeof x === 'bigint' ? x.toString() : x)
              const errEvents = (event.events || [])
                .filter((e: any) => e.type === 'System' && e.value?.type === 'ExtrinsicFailed')
              const detail = errEvents.length > 0 ? safeStr(errEvents[0].value) : 'unknown'
              // AlreadyMapped = account was already mapped — treat as success
              if (detail.toLowerCase().includes('already')) {
                console.log('ℹ️ Account already mapped on-chain, confirming cache...')
                resolve()
              } else {
                reject(new Error(`map_account failed on-chain: ${detail}`))
              }
            }
          }
        },
        error: (err: any) => {
          if (settled) return
          reject(err)
        }
      })
    })
    console.log('✅ Account mapping successful!')
    localStorage.setItem(MAPPING_CACHE_KEY(selectedAccount.address), 'true')
    setIsMapped(true)
  }, [apiClient, selectedAccount, signer])

  const resetMappingCache = useCallback(() => {
    const address = selectedAccount?.address
    if (address) {
      localStorage.removeItem(MAPPING_CACHE_KEY(address))
      console.warn('⚠️ Mapping cache cleared')
    }
    setIsMapped(null)
  }, [selectedAccount?.address])

  const value: WalletContextValue = {
    isConnected: extension !== null,
    isConnecting,
    isReconnecting,
    inHost,
    accounts,
    selectedAccount,
    apiClient,
    signer,
    isMapped,
    evmAddress,
    mapAccount,
    resetMappingCache,
    connect,
    disconnect,
    selectAccount
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
