/**
 * Intran3t Access Pass Smart Contract Integration
 *
 * ERC-721 NFT contract for location-based access control
 * Contract ABI, types, and constants for frontend integration
 */

// Contract address V2 (Self-Minting) - Deployed Jan 23, 2026
export const ACCESSPASS_CONTRACT_ADDRESS = import.meta.env.VITE_ACCESSPASS_CONTRACT_ADDRESS || '0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94';

// TypeScript interface matching Solidity struct
export interface AccessPassMetadata {
  location: string;           // Human-readable location name
  locationId: string;         // Unique location identifier
  holder: string;            // Address that holds the pass (0x format)
  issuedAt: bigint;         // Timestamp when issued
  expiresAt: bigint;        // Expiration timestamp (0 = never expires)
  accessLevel: string;       // Access level (standard, premium, admin, etc.)
  revoked: boolean;         // Whether pass has been revoked
  identityDisplay: string;  // On-chain identity display name
}

// Contract ABI (Application Binary Interface)
// Minimal ABI with essential functions
export const ACCESSPASS_ABI = [
  // ============ Read Functions ============

  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'getPassMetadata',
    outputs: [
      {
        components: [
          { internalType: 'string', name: 'location', type: 'string' },
          { internalType: 'string', name: 'locationId', type: 'string' },
          { internalType: 'address', name: 'holder', type: 'address' },
          { internalType: 'uint256', name: 'issuedAt', type: 'uint256' },
          { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
          { internalType: 'string', name: 'accessLevel', type: 'string' },
          { internalType: 'bool', name: 'revoked', type: 'bool' },
          { internalType: 'string', name: 'identityDisplay', type: 'string' }
        ],
        internalType: 'struct Intran3tAccessPass.AccessPassMetadata',
        name: 'metadata',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'isPassValid',
    outputs: [
      { internalType: 'bool', name: 'isValid', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'holder', type: 'address' }
    ],
    name: 'getPassesByHolder',
    outputs: [
      { internalType: 'uint256[]', name: 'tokenIds', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'string', name: 'locationId', type: 'string' }
    ],
    name: 'getPassesByLocation',
    outputs: [
      { internalType: 'uint256[]', name: 'tokenIds', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalMinted',
    outputs: [
      { internalType: 'uint256', name: 'count', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' }
    ],
    name: 'balanceOf',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'ownerOf',
    outputs: [
      { internalType: 'address', name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'tokenURI',
    outputs: [
      { internalType: 'string', name: '', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  },

  // ============ Write Functions ============

  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: 'location', type: 'string' },
      { internalType: 'string', name: 'locationId', type: 'string' },
      { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
      { internalType: 'string', name: 'accessLevel', type: 'string' },
      { internalType: 'string', name: 'identityDisplay', type: 'string' }
    ],
    name: 'mintAccessPass',
    outputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'revokeAccessPass',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' }
    ],
    name: 'grantMinterRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' }
    ],
    name: 'revokeMinterRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },

  // ============ Role Check Functions ============

  {
    inputs: [
      { internalType: 'bytes32', name: 'role', type: 'bytes32' },
      { internalType: 'address', name: 'account', type: 'address' }
    ],
    name: 'hasRole',
    outputs: [
      { internalType: 'bool', name: '', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },

  // ============ Events ============

  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'holder', type: 'address' },
      { indexed: false, internalType: 'string', name: 'location', type: 'string' },
      { indexed: false, internalType: 'string', name: 'locationId', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'AccessPassMinted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'revokedBy', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'AccessPassRevoked',
    type: 'event'
  }
] as const;

// Role constants (from AccessControl)
// These are computed as keccak256("ROLE_NAME") in Solidity
export const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775', // keccak256("ADMIN_ROLE")
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6', // keccak256("MINTER_ROLE")
} as const;

// Helper to convert AccessPass metadata to frontend format
export function metadataToAccessPass(
  tokenId: bigint,
  metadata: AccessPassMetadata
): {
  id: string;
  location: string;
  locationId: string;
  holder: string;
  createdAt: number;
  expiresAt?: number;
  accessLevel: string;
  nftId: number;
  onChain: boolean;
  revoked: boolean;
  identityDisplay: string;
} {
  return {
    id: `pass-${tokenId.toString()}`,
    location: metadata.location,
    locationId: metadata.locationId,
    holder: metadata.holder,
    createdAt: Number(metadata.issuedAt) * 1000, // Convert to milliseconds
    expiresAt: metadata.expiresAt > 0n ? Number(metadata.expiresAt) * 1000 : undefined,
    accessLevel: metadata.accessLevel,
    nftId: Number(tokenId),
    onChain: true,
    revoked: metadata.revoked,
    identityDisplay: metadata.identityDisplay,
  };
}

// Helper to check if pass is expired
export function isPassExpired(metadata: AccessPassMetadata): boolean {
  if (metadata.expiresAt === 0n) return false; // Never expires
  return Date.now() > Number(metadata.expiresAt) * 1000;
}

// Helper to format expiry date
export function formatExpiryDate(expiresAt: bigint): string {
  if (expiresAt === 0n) return 'Never';
  return new Date(Number(expiresAt) * 1000).toLocaleString();
}
