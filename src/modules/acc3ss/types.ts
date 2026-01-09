export interface Location {
  id: string
  name: string
  address?: string
  icon?: string
  description?: string
  image?: string
}

export interface AccessPass {
  id: string
  location: string
  locationId: string // Location identifier for matching
  holder: string // Wallet address
  createdAt: number
  expiresAt?: number
  signature: string
  qrCode?: string
  // NFT-specific fields
  nftId?: number // NFT item ID on Polkadot Hub
  collectionId?: number // NFT collection ID on Polkadot Hub
  txHash?: string // Transaction hash of NFT mint
  onChain?: boolean // Whether this pass is backed by an on-chain NFT
}

export interface Acc3ssConfig {
  title?: string
  description?: string
  locations?: Location[]
  passValidityHours?: number // Default validity for access passes
  generateNFT?: boolean // If true, mint NFT on Polkadot Hub
  nftCollectionId?: number // Polkadot Hub collection ID for access passes
  useRealData?: boolean
  apiEndpoint?: string
}
