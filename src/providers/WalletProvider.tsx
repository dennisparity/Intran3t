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

interface WalletContextValue {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  inHost: boolean

  // Accounts
  accounts: InjectedPolkadotAccount[]
  selectedAccount: InjectedPolkadotAccount | null

  // PAPI
  apiClient: any | null
  signer: PolkadotSigner | null

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
  const [apiClient, setApiClient] = useState<any>(null)
  const [signer, setSigner] = useState<PolkadotSigner | null>(null)

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

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem(WALLET_STORAGE_KEY)
    if (wasConnected === 'true' || inHost) {
      console.log('🔄 Auto-reconnecting wallet...')
      connect()
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

  const value: WalletContextValue = {
    isConnected: extension !== null,
    isConnecting,
    inHost,
    accounts,
    selectedAccount,
    apiClient,
    signer,
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
