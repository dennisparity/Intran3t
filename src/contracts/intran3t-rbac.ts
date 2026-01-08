/**
 * Intran3t RBAC Smart Contract Integration
 *
 * Contract ABI, types, and constants for frontend integration
 */

// Contract address (deployed to Paseo Asset Hub - 2026-01-07 - Updated with custom roles)
export const RBAC_CONTRACT_ADDRESS = '0xfde4dD5d4e31adDe12123b214D81c43b04921760';

// Enums matching Solidity contract
export enum Role {
  Admin = 0,
  Member = 1,
  Viewer = 2,
  PeopleCulture = 3
}

export enum Action {
  Create = 0,
  Read = 1,
  Update = 2,
  Delete = 3,
  Admin = 4,
  Vote = 5,
  Manage = 6
}

export enum Resource {
  Poll = 0,
  Form = 1,
  Governance = 2,
  User = 3,
  Settings = 4,
  All = 5
}

// TypeScript interfaces matching Solidity structs
export interface Organization {
  id: string; // bytes32
  name: string;
  owner: string; // address
  createdAt: bigint;
  memberCount: number;
  exists: boolean;
}

export interface Credential {
  id: string; // bytes32
  orgId: string; // bytes32
  subject: string; // address
  role: Role;
  issuedBy: string; // address
  issuedAt: bigint;
  expiresAt: bigint; // 0 means no expiration
  revoked: boolean;
}

// Helper to convert Role enum to string
export function roleToString(role: Role): string {
  switch (role) {
    case Role.Admin:
      return 'Admin';
    case Role.Member:
      return 'Member';
    case Role.Viewer:
      return 'Viewer';
    case Role.PeopleCulture:
      return 'People/Culture';
    default:
      return 'Unknown';
  }
}

// Helper to convert string to Role enum
export function stringToRole(role: string): Role {
  switch (role.toLowerCase()) {
    case 'admin':
      return Role.Admin;
    case 'member':
      return Role.Member;
    case 'viewer':
      return Role.Viewer;
    case 'people/culture':
    case 'peopleculture':
      return Role.PeopleCulture;
    default:
      return Role.Viewer;
  }
}

// Contract ABI (Application Binary Interface)
// This is a simplified ABI with the key functions we need
export const RBAC_ABI = [
  // Read functions (view)
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' }
    ],
    name: 'getOrganization',
    outputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'id', type: 'bytes32' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
          { internalType: 'uint32', name: 'memberCount', type: 'uint32' },
          { internalType: 'bool', name: 'exists', type: 'bool' }
        ],
        internalType: 'struct Intran3tRBAC.Organization',
        name: 'organization',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { internalType: 'address', name: 'user', type: 'address' }
    ],
    name: 'getUserRole',
    outputs: [
      { internalType: 'enum Intran3tRBAC.Role', name: 'role', type: 'uint8' },
      { internalType: 'bool', name: 'hasRole', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { internalType: 'address', name: 'user', type: 'address' }
    ],
    name: 'getCredential',
    outputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'id', type: 'bytes32' },
          { internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
          { internalType: 'address', name: 'subject', type: 'address' },
          { internalType: 'enum Intran3tRBAC.Role', name: 'role', type: 'uint8' },
          { internalType: 'address', name: 'issuedBy', type: 'address' },
          { internalType: 'uint256', name: 'issuedAt', type: 'uint256' },
          { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
          { internalType: 'bool', name: 'revoked', type: 'bool' }
        ],
        internalType: 'struct Intran3tRBAC.Credential',
        name: 'credential',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'enum Intran3tRBAC.Action', name: 'action', type: 'uint8' },
      { internalType: 'enum Intran3tRBAC.Resource', name: 'resource', type: 'uint8' }
    ],
    name: 'hasPermission',
    outputs: [
      { internalType: 'bool', name: '', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' }
    ],
    name: 'getOrganizationMembers',
    outputs: [
      { internalType: 'address[]', name: 'members', type: 'address[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' }
    ],
    name: 'getMemberCount',
    outputs: [
      { internalType: 'uint32', name: 'count', type: 'uint32' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  // Write functions
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' }
    ],
    name: 'createOrganization',
    outputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { internalType: 'address', name: 'subject', type: 'address' },
      { internalType: 'enum Intran3tRBAC.Role', name: 'role', type: 'uint8' },
      { internalType: 'uint256', name: 'expiresAt', type: 'uint256' }
    ],
    name: 'issueCredential',
    outputs: [
      { internalType: 'bytes32', name: 'credentialId', type: 'bytes32' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { internalType: 'address', name: 'subject', type: 'address' }
    ],
    name: 'revokeCredential',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { internalType: 'address', name: 'subject', type: 'address' },
      { internalType: 'enum Intran3tRBAC.Role', name: 'newRole', type: 'uint8' }
    ],
    name: 'updateRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'OrganizationCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'credentialId', type: 'bytes32' },
      { indexed: true, internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'subject', type: 'address' },
      { indexed: false, internalType: 'enum Intran3tRBAC.Role', name: 'role', type: 'uint8' },
      { indexed: false, internalType: 'address', name: 'issuedBy', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'CredentialIssued',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'subject', type: 'address' },
      { indexed: true, internalType: 'address', name: 'revokedBy', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'CredentialRevoked',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'orgId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'subject', type: 'address' },
      { indexed: false, internalType: 'enum Intran3tRBAC.Role', name: 'oldRole', type: 'uint8' },
      { indexed: false, internalType: 'enum Intran3tRBAC.Role', name: 'newRole', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'RoleUpdated',
    type: 'event'
  }
] as const;
