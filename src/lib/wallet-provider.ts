/**
 * Wallet Provider - Product SDK Integration
 *
 * Handles wallet connection using @novasamatech/product-sdk
 * Falls back to regular wallet extensions when not in host
 */

import { injectSpektrExtension } from '@novasamatech/product-sdk'
import { connectInjectedExtension, type InjectedPolkadotAccount } from 'polkadot-api/pjs-signer'
import { decodeAddress } from '@polkadot/util-crypto'
import { createStandaloneTxSigner } from './standalone-tx-signer'

export interface WalletExtension {
  name: string
  accounts: InjectedPolkadotAccount[]
  getAccounts: () => Promise<InjectedPolkadotAccount[]>
  subscribe: (callback: (accounts: InjectedPolkadotAccount[]) => void) => { unsubscribe: () => void }
}

/**
 * Detects if app is running inside a Polkadot Triangle host (webview or iframe).
 */
export function isInHost(): boolean {
  if (typeof window === 'undefined') return false
  if ((window as any).__HOST_WEBVIEW_MARK__) return true
  try {
    return window !== window.top
  } catch {
    return true // cross-origin iframe
  }
}

const DAPP_NAME = 'intran3t'

function buildAccountsFromBridge(rawAccounts: any[]): InjectedPolkadotAccount[] {
  return rawAccounts.map((account: any) => {
    const address: string = account.address
    const publicKey = decodeAddress(address)
    const polkadotSigner = createStandaloneTxSigner({
      extensionName: 'spektr',
      dappName: DAPP_NAME,
      address,
      publicKey,
      keypairType: account.type || 'sr25519',
    })
    return { address, name: account.name || account.meta?.name || 'Triangle Account', polkadotSigner } as InjectedPolkadotAccount
  })
}

/**
 * Gets the Spektr extension (Triangle Host) via window.injectedWeb3.spektr.
 * Matches dforms-powered-by-polkadot pattern.
 */
async function getSpektrExtension(): Promise<WalletExtension | null> {
  try {
    const ready = await injectSpektrExtension()
    if (!ready) return null

    const injectedWeb3 = (window as any).injectedWeb3
    const spektrEntry = injectedWeb3?.spektr
    if (!spektrEntry) return null

    const spektrExtension = typeof spektrEntry.enable === 'function'
      ? await spektrEntry.enable(DAPP_NAME)
      : spektrEntry

    const rawAccounts = await spektrExtension.accounts.get()
    if (rawAccounts.length === 0) return null

    const accounts = buildAccountsFromBridge(rawAccounts)

    return {
      name: 'spektr',
      accounts,
      getAccounts: async () => {
        const fresh = await spektrExtension.accounts.get()
        return buildAccountsFromBridge(fresh)
      },
      subscribe: (_callback) => ({ unsubscribe: () => {} })
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Environment is not correct')) {
      console.log('ℹ️ Spektr requires Polkadot Host environment, using browser wallets')
    } else {
      console.warn('[Spektr] Failed to initialize:', error)
    }
    return null
  }
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
      const rawAccounts = await extension.getAccounts()

      if (rawAccounts.length > 0) {
        const wrapAccounts = (accs: InjectedPolkadotAccount[]) =>
          accs.map(acc => ({
            ...acc,
            polkadotSigner: createStandaloneTxSigner({
              extensionName: name,
              dappName: DAPP_NAME,
              address: acc.address,
              publicKey: acc.polkadotSigner.publicKey,
              keypairType: (acc as any).type || 'sr25519',
            }),
          }))

        return {
          name,
          accounts: wrapAccounts(rawAccounts),
          getAccounts: () => extension.getAccounts().then(wrapAccounts),
          subscribe: (callback) => extension.subscribe(accs => callback(wrapAccounts(accs))),
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
