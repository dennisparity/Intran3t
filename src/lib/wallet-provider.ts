/**
 * Wallet Provider - Product SDK Integration
 *
 * Handles wallet connection using @novasamatech/product-sdk
 * Falls back to regular wallet extensions when not in host
 */

import { injectSpektrExtension, SpektrExtensionName } from '@novasamatech/product-sdk'
import { connectInjectedExtension, type InjectedPolkadotAccount } from 'polkadot-api/pjs-signer'

export interface WalletExtension {
  name: string
  accounts: InjectedPolkadotAccount[]
  getAccounts: () => Promise<InjectedPolkadotAccount[]>
  subscribe: (callback: (accounts: InjectedPolkadotAccount[]) => void) => { unsubscribe: () => void }
}

/**
 * Detects if app is running inside a Polkadot host
 */
export function isInHost(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__HOST_WEBVIEW_MARK__
}

/**
 * Gets the Spektr extension (Product SDK) if available
 */
async function getSpektrExtension(): Promise<WalletExtension | null> {
  try {
    const ready = await injectSpektrExtension()

    if (ready) {
      const extension = await connectInjectedExtension(SpektrExtensionName)
      const accounts = await extension.getAccounts()

      return {
        name: SpektrExtensionName,
        accounts,
        getAccounts: () => extension.getAccounts(),
        subscribe: (callback) => extension.subscribe(callback)
      }
    }
  } catch (error) {
    // Expected error in browser (Spektr only works in Polkadot Host)
    if (error instanceof Error && error.message.includes('Environment is not correct')) {
      console.log('ℹ️ Spektr requires Polkadot Host environment, using browser wallets')
    } else {
      console.warn('Failed to inject Spektr extension:', error)
    }
  }

  return null
}

/**
 * Gets a fallback wallet extension (Talisman, SubWallet, etc.)
 */
async function getFallbackExtension(preferredWallet?: string): Promise<WalletExtension | null> {
  // Try common wallet extensions in order of preference
  const defaultOrder = ['talisman', 'subwallet-js', 'polkadot-js']

  // If user selected a specific wallet, try that first
  const extensionNames = preferredWallet
    ? [preferredWallet, ...defaultOrder.filter(name => name !== preferredWallet)]
    : defaultOrder

  for (const name of extensionNames) {
    try {
      const extension = await connectInjectedExtension(name)
      const accounts = await extension.getAccounts()

      if (accounts.length > 0) {
        return {
          name,
          accounts,
          getAccounts: () => extension.getAccounts(),
          subscribe: (callback) => extension.subscribe(callback)
        }
      }
    } catch (error) {
      // Extension not available, try next
      continue
    }
  }

  return null
}

/**
 * Gets the best available wallet extension
 * Prefers Product SDK (Spektr) when in host, falls back to regular wallets
 * @param preferredWallet - Optional wallet ID to try first (e.g., 'talisman', 'subwallet-js')
 */
export async function getWalletExtension(preferredWallet?: string): Promise<WalletExtension | null> {
  // Try Product SDK first (works in host and can work standalone)
  const spektr = await getSpektrExtension()
  if (spektr) {
    console.log('✅ Connected via Product SDK (Spektr)')
    return spektr
  }

  // Fallback to regular wallet extensions
  const fallback = await getFallbackExtension(preferredWallet)
  if (fallback) {
    console.log(`✅ Connected via ${fallback.name}`)
    return fallback
  }

  console.warn('❌ No wallet extension available')
  return null
}

/**
 * Hook to manage wallet connection state
 */
export function createWalletManager() {
  let currentExtension: WalletExtension | null = null
  let accountsSubscription: { unsubscribe: () => void } | null = null

  async function connect(): Promise<WalletExtension | null> {
    currentExtension = await getWalletExtension()
    return currentExtension
  }

  function disconnect() {
    if (accountsSubscription) {
      accountsSubscription.unsubscribe()
      accountsSubscription = null
    }
    currentExtension = null
  }

  function subscribeAccounts(callback: (accounts: InjectedPolkadotAccount[]) => void) {
    if (currentExtension) {
      accountsSubscription = currentExtension.subscribe(callback)
      return accountsSubscription
    }
    return null
  }

  return {
    connect,
    disconnect,
    subscribeAccounts,
    get extension() {
      return currentExtension
    }
  }
}
