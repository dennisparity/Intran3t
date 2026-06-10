/**
 * Wallet Provider - Product SDK Integration
 *
 * Handles wallet connection using @novasamatech/product-sdk
 * Falls back to regular wallet extensions when not in host
 */

import { injectSpektrExtension, accounts } from '@novasamatech/host-api-wrapper'
import { connectInjectedExtension, type InjectedPolkadotAccount } from 'polkadot-api/pjs-signer'
import { encodeAddress } from '@polkadot/util-crypto'
import { createStandaloneTxSigner } from './standalone-tx-signer'

// The DotNS identifier for this product — must match the deployed domain
const PRODUCT_DOTNS_ID = 'intran3t.dot'

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

/**
 * Gets the product account from the Triangle host via Product SDK.
 * Uses host_create_transaction protocol — handles AsPgas extension natively,
 * works on Polkadot Desktop >= 0.3.10, Mobile, and Web host.
 */
async function getSpektrExtension(): Promise<WalletExtension | null> {
  try {
    const ready = await injectSpektrExtension()
    if (!ready) return null

    const accountResult = await accounts.getProductAccount(PRODUCT_DOTNS_ID, 0)
    if (!accountResult.isOk()) {
      console.warn('[Spektr] Product account unavailable:', accountResult.error.tag)
      return null
    }

    const productAccount = accountResult.value
    // createTransaction signer: delegates signing to the host via host_create_transaction.
    // The host assembles the full transaction, handles AsPgas and any other signed extensions.
    const signer = accounts.getProductAccountSigner(productAccount, 'createTransaction')
    // publicKey is raw bytes — encode to generic SS58 (prefix 42) for address display
    const address = encodeAddress(productAccount.publicKey, 42)

    const userIdResult = await accounts.getUserId()
    const displayName = userIdResult.isOk()
      ? userIdResult.value.primaryUsername
      : productAccount.dotNsIdentifier

    const injectedAccount: InjectedPolkadotAccount = {
      address,
      name: displayName,
      polkadotSigner: signer,
    }

    return {
      name: 'spektr',
      accounts: [injectedAccount],
      getAccounts: async () => [injectedAccount],
      subscribe: (_callback) => ({ unsubscribe: () => {} }),
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Environment is not correct')) {
      console.log('ℹ️ Not in Polkadot Host environment, falling back to browser wallets')
    } else {
      console.warn('[Spektr] Failed to get product account:', err)
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
