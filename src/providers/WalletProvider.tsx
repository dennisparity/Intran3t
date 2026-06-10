/**
 * Wallet Provider - React Context
 *
 * Replaces Typink with Product SDK integration
 * Provides wallet state and accounts to components
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from 'polkadot-api'
import { getWsProvider } from 'polkadot-api/ws'
import { createPapiProvider } from '@novasamatech/host-api-wrapper'
import type { InjectedPolkadotAccount, PolkadotSigner } from 'polkadot-api/pjs-signer'
import { getWalletExtension, isInHost, type WalletExtension } from '../lib/wallet-provider'
import { paseo } from '../../.papi/descriptors'
import { keccak256 } from 'viem'
import { decodeAddress } from '@polkadot/util-crypto'

const PASEO_ASSET_HUB_GENESIS = '0x173cea9df45656cf612c8b8ece56e04e9a693c69cfaac47d3628dae735067af8'

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
  unsafeApiClient: any | null
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
  const [unsafeApiClient, setUnsafeApiClient] = useState<any>(null)
  const [signer, setSigner] = useState<PolkadotSigner | null>(null)

  // Mapping state — single shared instance for all modules
  const [isMapped, setIsMapped] = useState<boolean | null>(null)
  const [evmAddress, setEvmAddress] = useState<`0x${string}` | null>(null)

  const inHost = isInHost()

  // Initialize PAPI client
  useEffect(() => {
    const initApi = async () => {
      try {
        const wsProvider = getWsProvider([
          'wss://paseo-asset-hub-next-rpc.polkadot.io',
        ] as unknown as string)
        // In Triangle host: route chain calls through the host (smoldot/light client)
        // with WS as fallback if the host doesn't support this chain.
        // Standalone: use WS directly.
        const provider = inHost ? createPapiProvider(PASEO_ASSET_HUB_GENESIS, wsProvider) : wsProvider
        const client = createClient(provider)
        const api = client.getTypedApi(paseo)
        const unsafeApi = client.getUnsafeApi()
        setApiClient(api)
        setUnsafeApiClient(unsafeApi)
        console.log(`✅ PAPI client initialized (${inHost ? 'host' : 'standalone'} mode)`)
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

        // Save connection state to localStorage (browser only — not needed in Host)
        if (!inHost) localStorage.setItem(WALLET_STORAGE_KEY, 'true')
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
      if (!inHost) localStorage.setItem(ACCOUNT_STORAGE_KEY, address)

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

  // Auto-reconnect on mount.
  // - Host (__HOST_WEBVIEW_MARK__): connect immediately
  // - Triangle (no mark, but Spektr available): connect immediately via silent detection
  // - Browser with prior connection: delay 500ms for extensions to inject
  useEffect(() => {
    const wasConnected = localStorage.getItem(WALLET_STORAGE_KEY)
    const RECONNECT_TIMEOUT_MS = 12_000
    let safetyTimer: ReturnType<typeof setTimeout> | null = null
    let delayTimer: ReturnType<typeof setTimeout> | null = null

    function attemptConnect() {
      // Safety net: clear reconnecting after 12s even if connect() hangs
      safetyTimer = setTimeout(() => {
        console.warn('⚠️ Wallet reconnect timed out — continuing without wallet')
        setIsReconnecting(false)
      }, RECONNECT_TIMEOUT_MS)

      connect().finally(() => {
        if (safetyTimer) clearTimeout(safetyTimer)
        setIsReconnecting(false)
      })
    }

    if (inHost || wasConnected === 'true') {
      setIsReconnecting(true)
      console.log('🔄 Auto-reconnecting wallet...')
      const delay = inHost ? 0 : 500
      delayTimer = setTimeout(attemptConnect, delay)
    } else {
      // Try silent Spektr detection for Triangle hosts that don't set __HOST_WEBVIEW_MARK__
      import('@novasamatech/host-api-wrapper')
        .then(({ injectSpektrExtension }) => injectSpektrExtension())
        .then(ready => {
          if (ready) {
            setIsReconnecting(true)
            attemptConnect()
          }
        })
        .catch(() => {})
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer)
      if (safetyTimer) clearTimeout(safetyTimer)
    }
  }, []) // Only run on mount

  // Restore selected account after accounts are loaded (browser only — Host auto-selects fresh accounts)
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount && !inHost) {
      const savedAddress = localStorage.getItem(ACCOUNT_STORAGE_KEY)
      if (savedAddress) {
        const savedAccount = accounts.find(a => a.address === savedAddress)
        if (savedAccount) {
          selectAccount(savedAddress)
          console.log('✅ Restored account:', savedAddress)
        }
      }
    }
  }, [accounts, selectedAccount, selectAccount, inHost])

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

  // Auto-map silently when inside Triangle host and account is confirmed unmapped.
  // No UI prompt — mapping is an implementation detail the user shouldn't see.
  useEffect(() => {
    if (!inHost || isMapped !== false || !signer || !apiClient) return
    console.log('🗺️ Auto-mapping account in Triangle host (background)...')
    mapAccount().catch(err => {
      console.warn('⚠️ Background account mapping failed:', err?.message)
    })
  }, [isMapped, inHost, signer, apiClient]) // mapAccount excluded intentionally — stable callback, dep on its inputs above

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
    unsafeApiClient,
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
