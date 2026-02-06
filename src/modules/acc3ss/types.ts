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
  holder: string // Wallet address (EVM 0x... format for smart contract)
  createdAt: number
  expiresAt?: number
  signature: string
  qrCode?: string
  // NFT-specific fields
  nftId?: number // NFT token ID (ERC-721)
  collectionId?: number // NFT collection ID (deprecated - for old pallet approach)
  txHash?: string // Transaction hash of NFT mint
  onChain?: boolean // Whether this pass is backed by an on-chain NFT
  accessLevel?: string // Access level (standard, premium, etc.)
  identityDisplay?: string // On-chain identity display name
}

export interface Acc3ssConfig {
  title?: string
  description?: string
  locations?: Location[]
  passValidityHours?: number // Default validity for access passes
  generateNFT?: boolean // If true, mint NFT on Polkadot Hub
  nftCollectionId?: number // Polkadot Hub collection ID for access passes
  adminAddresses?: string[] // Addresses allowed to create NFT collections
  useRealData?: boolean
  apiEndpoint?: string
}
