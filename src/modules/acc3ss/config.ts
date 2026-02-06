import type { Acc3ssConfig, Location, AccessPass } from './types'

// Storage key for access passes
export const ACCESS_PASSES_STORAGE_KEY = 'intran3t_access_passes'

// Available locations
export const LOCATIONS: Location[] = [
  {
    id: 'berlin',
    name: 'Berlin Office',
    address: 'Berlin, Germany',
    icon: '🏢',
    description: 'Main office in Berlin'
  },
  {
    id: 'lisbon',
    name: 'Lisbon Office',
    address: 'Lisbon, Portugal',
    icon: '🌊',
    description: 'European hub in Lisbon'
  },
  {
    id: 'london',
    name: 'London Office',
    address: 'London, UK',
    icon: '🎡',
    description: 'UK headquarters in London'
  },
  {
    id: 'palace',
    name: 'Palace',
    address: 'Undisclosed Location',
    icon: '👑',
    description: 'Exclusive executive location'
  }
]

export const defaultAcc3ssConfig: Acc3ssConfig = {
  title: 'Acc3ss',
  description: 'Generate NFT access passes for Parity locations',
  locations: LOCATIONS,
  passValidityHours: 24, // 24 hour validity
  generateNFT: true, // Mint NFT on Polkadot Hub TestNet
  nftCollectionId: undefined, // TODO: Replace with actual collection ID after creation
  adminAddresses: [
    // Substrate addresses (old NFT pallet approach - deprecated)
    '167jTxA5TBuSXVCiJcCoLSHe5Nekp4uMTzHDRXjPxSNV2SJS',
    '5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR',
    // EVM addresses (smart contract approach - current)
    '0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62', // Dennis - EVM deployer
  ],
  useRealData: false
}

// Helper to load passes from localStorage
export function loadAccessPasses(): AccessPass[] {
  try {
    const stored = localStorage.getItem(ACCESS_PASSES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load access passes:', e)
  }
  return []
}

// Helper to save passes to localStorage
export function saveAccessPasses(passes: AccessPass[]) {
  try {
    localStorage.setItem(ACCESS_PASSES_STORAGE_KEY, JSON.stringify(passes))
  } catch (e) {
    console.error('Failed to save access passes:', e)
  }
}
