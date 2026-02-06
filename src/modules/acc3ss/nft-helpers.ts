import { ApiPromise, WsProvider } from '@polkadot/api'
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { web3Enable, web3FromSource } from '@polkadot/extension-dapp'
import * as Sc from '@substrate/connect'

// Collection ID for access passes (needs to be created once)
export const ACCESS_PASS_COLLECTION_ID = 1000 // TODO: Set actual collection ID

export interface NFTMetadata {
  location: string
  locationId: string
  holder: string
  expiresAt?: number
  createdAt: number
  accessLevel: string
}

// RPC endpoints for Polkadot Hub TestNet (Asset Hub)
// Note: Using WebSocket endpoints for native Substrate calls (NFT pallet)
const POLKADOT_HUB_TESTNET_RPC_ENDPOINTS = [
  'wss://services.polkadothub-rpc.com/testnet',
  'wss://polkadot-hub-testnet-rpc.polkadot.io', // Fallback (may not exist yet)
  'wss://sys.ibp.network/polkadot-hub-testnet'  // Fallback (may not exist yet)
]

// Singleton API instance to avoid multiple connections
let assetHubApiInstance: ApiPromise | null = null
let connectionAttempts = 0
let web3Initialized = false

/**
 * Get wallet signer for an account
 * Handles initialization of Polkadot.js extension interface
 */
async function getWalletSigner(account: InjectedAccountWithMeta) {
  console.log('Getting wallet signer for account:', account.address, 'source:', account.meta.source)

  // Initialize web3 extensions if not already done
  if (!web3Initialized) {
    console.log('Initializing web3 extensions...')
    const extensions = await web3Enable('Intran3t')
    console.log('Available extensions:', extensions.map(e => e.name))

    if (extensions.length === 0) {
      throw new Error('No Polkadot wallet extensions found. Please install and enable Talisman, SubWallet, or Polkadot.js extension.')
    }
    web3Initialized = true
  }

  // Get the injector for this account's source wallet
  try {
    console.log('Getting injector from source:', account.meta.source)
    const injector = await web3FromSource(account.meta.source)
    console.log('Got injector:', injector)

    if (!injector.signer) {
      throw new Error(`Wallet extension "${account.meta.source}" does not provide a signer`)
    }

    return injector
  } catch (error) {
    console.error('Failed to get signer from source:', error)
    throw new Error(`Failed to access wallet "${account.meta.source}": ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Initialize Polkadot Hub API connection
 * Attempts light client first, falls back to RPC for development
 */
export async function getAssetHubApi(): Promise<ApiPromise> {
  if (assetHubApiInstance) {
    return assetHubApiInstance
  }

  console.log('Initializing connection to Polkadot Hub TestNet...')

  // For now, use RPC endpoints with multiple fallbacks
  // TODO: Implement light client when Polkadot Hub TestNet chain spec is available
  const errors: string[] = []

  for (const endpoint of POLKADOT_HUB_TESTNET_RPC_ENDPOINTS) {
    try {
      console.log(`Attempting connection to ${endpoint}...`)

      const provider = new WsProvider(endpoint, 1000) // 1 second timeout

      // Wait for connection with timeout
      const connectPromise = new Promise<ApiPromise>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 5000) // 5 second total timeout

        ApiPromise.create({ provider })
          .then(api => api.isReady)
          .then(api => {
            clearTimeout(timeout)
            resolve(api)
          })
          .catch(err => {
            clearTimeout(timeout)
            reject(err)
          })
      })

      const api = await connectPromise
      console.log(`✓ Connected to Polkadot Hub TestNet via ${endpoint}`)
      assetHubApiInstance = api
      return api

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.warn(`✗ Failed to connect to ${endpoint}: ${errorMsg}`)
      errors.push(`${endpoint}: ${errorMsg}`)
      continue
    }
  }

  // All endpoints failed
  const errorMessage = `Failed to connect to Polkadot Hub TestNet. Tried ${POLKADOT_HUB_TESTNET_RPC_ENDPOINTS.length} endpoints:\n${errors.join('\n')}`
  console.error(errorMessage)
  throw new Error(errorMessage)
}

/**
 * Create NFT collection for access passes
 * This should be called once by the admin to set up the collection
 */
export async function createAccessPassCollection(
  account: InjectedAccountWithMeta,
  adminAddress: string
): Promise<{
  success: boolean
  collectionId?: number
  txHash?: string
  error?: string
}> {
  try {
    console.log('createAccessPassCollection: Starting...')
    console.log('Account:', account)
    console.log('Admin address:', adminAddress)

    console.log('Connecting to Polkadot Hub API...')
    const api = await getAssetHubApi()
    console.log('Connected to Polkadot Hub API')

    // Get the signer from the account's wallet
    console.log('Getting signer for account:', account.address)
    const injector = await getWalletSigner(account)
    console.log('Got injector with signer')

    // Create collection
    // Collection config: admin, max supply, mint settings
    console.log('Creating transaction...')
    const tx = api.tx.nfts.create(
      adminAddress, // Collection owner
      {
        settings: 0, // Collection settings bitfield
        maxSupply: null, // No max supply
        mintSettings: {
          mintType: { Issuer: null }, // Only issuer can mint
          price: null, // Free minting
          startBlock: null, // Start immediately
          endBlock: null // No end block
        }
      }
    )
    console.log('Transaction created, signing and sending...')

    return new Promise((resolve) => {
      tx.signAndSend(account.address, { signer: injector.signer }, ({ status, events, dispatchError }) => {
        console.log('Transaction status:', status.type)
        if (status.isInBlock || status.isFinalized) {
          // Check for dispatch errors
          if (dispatchError) {
            let errorMessage = 'Transaction failed'
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(dispatchError.asModule)
              errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`
            }
            resolve({ success: false, error: errorMessage })
            api.disconnect()
            return
          }

          // Find the collection ID from events
          const collectionCreatedEvent = events.find(
            ({ event }) => event.section === 'nfts' && event.method === 'Created'
          )

          if (collectionCreatedEvent) {
            const collectionId = collectionCreatedEvent.event.data[0].toNumber()
            resolve({
              success: true,
              collectionId,
              txHash: status.asInBlock?.toString() || status.asFinalized?.toString()
            })
          } else {
            resolve({ success: false, error: 'Collection creation event not found in transaction' })
          }
        }
      }).catch((error) => {
        let errorMsg = error.message || 'Unknown error'
        if (errorMsg.includes('Cancelled')) {
          errorMsg = 'Transaction was cancelled by user'
        }
        resolve({ success: false, error: errorMsg })
      })
    })
  } catch (error: any) {
    let errorMsg = error.message || 'Unknown error'
    if (errorMsg.includes('extension')) {
      errorMsg = 'Wallet extension not found or not accessible. Please install and enable a Polkadot wallet.'
    }
    return { success: false, error: errorMsg }
  }
}

/**
 * Mint an NFT access pass
 */
export async function mintAccessPassNFT(
  account: InjectedAccountWithMeta,
  metadata: NFTMetadata,
  collectionId: number = ACCESS_PASS_COLLECTION_ID
): Promise<{
  success: boolean
  nftId?: number
  txHash?: string
  error?: string
}> {
  try {
    const api = await getAssetHubApi()

    // Get the signer from the account's wallet
    const injector = await getWalletSigner(account)

    // Generate unique NFT ID based on timestamp
    const nftId = Date.now()

    // Prepare metadata JSON
    const metadataJson = JSON.stringify(metadata)
    const metadataBytes = new TextEncoder().encode(metadataJson)

    // Mint NFT to the holder's address
    const mintTx = api.tx.nfts.mint(
      collectionId,
      nftId,
      account.address, // Mint to user's address
      null // No witness data
    )

    // Set metadata for the NFT
    const setMetadataTx = api.tx.nfts.setMetadata(
      collectionId,
      nftId,
      metadataBytes
    )

    // Batch both transactions
    const batchTx = api.tx.utility.batchAll([mintTx, setMetadataTx])

    return new Promise((resolve) => {
      batchTx.signAndSend(account.address, { signer: injector.signer }, ({ status, events, dispatchError }) => {
        if (status.isInBlock || status.isFinalized) {
          // Check for dispatch errors
          if (dispatchError) {
            let errorMessage = 'Transaction failed'
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(dispatchError.asModule)
              errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`

              // Provide specific guidance for common errors
              if (decoded.name === 'CollectionNotFound' || decoded.name === 'UnknownCollection') {
                errorMessage += '\n\nThe NFT collection does not exist. Please create it first using the Admin panel.'
              } else if (decoded.name === 'NoPermission') {
                errorMessage += '\n\nYou do not have permission to mint NFTs in this collection.'
              } else if (decoded.name === 'AlreadyExists') {
                errorMessage += '\n\nThis NFT ID already exists. Please try again.'
              }
            }
            resolve({ success: false, error: errorMessage })
            return
          }

          // Check for successful mint
          const mintEvent = events.find(
            ({ event }) => event.section === 'nfts' && event.method === 'Issued'
          )

          if (mintEvent) {
            resolve({
              success: true,
              nftId,
              txHash: status.asInBlock?.toString() || status.asFinalized?.toString()
            })
          } else {
            resolve({ success: false, error: 'NFT mint event not found in transaction' })
          }
        }
      }).catch((error) => {
        let errorMsg = error.message || 'Unknown error'
        if (errorMsg.includes('Cancelled')) {
          errorMsg = 'Transaction was cancelled by user'
        } else if (errorMsg.includes('1010')) {
          errorMsg = 'Insufficient balance to pay transaction fees. Please ensure you have enough PAS tokens.'
        }
        resolve({ success: false, error: errorMsg })
      })
    })
  } catch (error: any) {
    let errorMsg = error.message || 'Unknown error'
    if (errorMsg.includes('extension')) {
      errorMsg = 'Wallet extension not found or not accessible. Please install and enable a Polkadot wallet.'
    } else if (errorMsg.includes('connect')) {
      errorMsg = 'Failed to connect to Polkadot Hub TestNet. Please check your internet connection.'
    }
    return { success: false, error: errorMsg }
  }
}

/**
 * Query NFT ownership and metadata
 */
export async function queryAccessPassNFT(
  collectionId: number,
  nftId: number
): Promise<{
  success: boolean
  owner?: string
  metadata?: NFTMetadata
  error?: string
}> {
  try {
    const api = await getAssetHubApi()

    // Query NFT owner
    const nftDetails = await api.query.nfts.item(collectionId, nftId)

    if (nftDetails.isNone) {
      return { success: false, error: 'NFT not found' }
    }

    const details = nftDetails.unwrap()
    const owner = details.owner.toString()

    // Query metadata
    const metadataQuery = await api.query.nfts.itemMetadataOf(collectionId, nftId)

    let metadata: NFTMetadata | undefined

    if (metadataQuery.isSome) {
      const metadataData = metadataQuery.unwrap()
      const metadataBytes = metadataData.data.toU8a()
      const metadataString = new TextDecoder().decode(metadataBytes)
      metadata = JSON.parse(metadataString)
    }

    return {
      success: true,
      owner,
      metadata
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Burn/revoke an access pass NFT
 */
export async function revokeAccessPassNFT(
  account: InjectedAccountWithMeta,
  collectionId: number,
  nftId: number
): Promise<{
  success: boolean
  txHash?: string
  error?: string
}> {
  try {
    const api = await getAssetHubApi()

    // Get the signer from the account's wallet
    const injector = await getWalletSigner(account)

    const tx = api.tx.nfts.burn(collectionId, nftId)

    return new Promise((resolve) => {
      tx.signAndSend(account.address, { signer: injector.signer }, ({ status, dispatchError }) => {
        if (status.isInBlock || status.isFinalized) {
          // Check for dispatch errors
          if (dispatchError) {
            let errorMessage = 'Transaction failed'
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(dispatchError.asModule)
              errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`

              // Provide specific guidance for common errors
              if (decoded.name === 'UnknownItem' || decoded.name === 'ItemNotFound') {
                errorMessage += '\n\nThe NFT does not exist or has already been revoked.'
              } else if (decoded.name === 'NoPermission') {
                errorMessage += '\n\nYou do not have permission to revoke this NFT.'
              }
            }
            resolve({ success: false, error: errorMessage })
            return
          }

          resolve({
            success: true,
            txHash: status.asInBlock?.toString() || status.asFinalized?.toString()
          })
        }
      }).catch((error) => {
        let errorMsg = error.message || 'Unknown error'
        if (errorMsg.includes('Cancelled')) {
          errorMsg = 'Transaction was cancelled by user'
        } else if (errorMsg.includes('1010')) {
          errorMsg = 'Insufficient balance to pay transaction fees. Please ensure you have enough PAS tokens.'
        }
        resolve({ success: false, error: errorMsg })
      })
    })
  } catch (error: any) {
    let errorMsg = error.message || 'Unknown error'
    if (errorMsg.includes('extension')) {
      errorMsg = 'Wallet extension not found or not accessible. Please install and enable a Polkadot wallet.'
    } else if (errorMsg.includes('connect')) {
      errorMsg = 'Failed to connect to Polkadot Hub TestNet. Please check your internet connection.'
    }
    return { success: false, error: errorMsg }
  }
}

/**
 * Check if user owns a valid access pass for a location
 */
export async function checkUserAccessPass(
  userAddress: string,
  locationId: string,
  collectionId: number = ACCESS_PASS_COLLECTION_ID
): Promise<{
  hasAccess: boolean
  nftId?: number
  expiresAt?: number
  error?: string
}> {
  try {
    const api = await getAssetHubApi()

    // Query all NFTs owned by user in the collection
    // This is a simplified check - in production you'd want to index this
    const accountNFTs = await api.query.nfts.account.entries(userAddress)

    for (const [key, value] of accountNFTs) {
      const [, col, itemId] = key.args

      if (col.toNumber() === collectionId && value.isSome) {
        // Query metadata for this NFT
        const metadataQuery = await api.query.nfts.itemMetadataOf(collectionId, itemId.toNumber())

        if (metadataQuery.isSome) {
          const metadataData = metadataQuery.unwrap()
          const metadataBytes = metadataData.data.toU8a()
          const metadataString = new TextDecoder().decode(metadataBytes)
          const metadata: NFTMetadata = JSON.parse(metadataString)

          // Check if this is for the requested location
          if (metadata.locationId === locationId) {
            // Check expiry
            if (metadata.expiresAt && metadata.expiresAt < Date.now()) {
              continue // Expired, check next
            }

            return {
              hasAccess: true,
              nftId: itemId.toNumber(),
              expiresAt: metadata.expiresAt
            }
          }
        }
      }
    }

    return { hasAccess: false }
  } catch (error: any) {
    return { hasAccess: false, error: error.message }
  }
}
