/**
 * useRBACContract Hook
 *
 * React hook for interacting with the Intran3t RBAC smart contract
 */

import { useState, useEffect, useCallback } from 'react';
import { Contract, BrowserProvider, JsonRpcSigner } from 'ethers';
import {
  RBAC_CONTRACT_ADDRESS,
  RBAC_ABI,
  Role,
  Action,
  Resource,
  Organization,
  Credential,
  roleToString,
  stringToRole
} from '../contracts/intran3t-rbac';

// Types
type Provider = BrowserProvider | null;
type Signer = JsonRpcSigner | null;

/**
 * Hook return type
 */
interface UseRBACContractReturn {
  // Contract instance
  contract: Contract | null;

  // Loading and error states
  loading: boolean;
  error: string | null;

  // Read functions
  getOrganization: (orgId: string) => Promise<Organization | null>;
  getUserRole: (orgId: string, userAddress: string) => Promise<{ role: Role; hasRole: boolean }>;
  getCredential: (orgId: string, userAddress: string) => Promise<Credential | null>;
  hasPermission: (orgId: string, userAddress: string, action: Action, resource: Resource) => Promise<boolean>;
  getOrganizationMembers: (orgId: string) => Promise<string[]>;
  getMemberCount: (orgId: string) => Promise<number>;

  // Write functions (require signer)
  createOrganization: (name: string) => Promise<string>; // returns orgId
  issueCredential: (orgId: string, subject: string, role: Role, expiresAt: number) => Promise<string>; // returns credentialId
  revokeCredential: (orgId: string, subject: string) => Promise<void>;
  updateRole: (orgId: string, subject: string, newRole: Role) => Promise<void>;

  // Helper functions
  can: (orgId: string, userAddress: string, action: Action, resource: Resource) => Promise<boolean>;
}

/**
 * React hook for RBAC contract interaction
 *
 * @param provider - Ethers provider (BrowserProvider from window.ethereum)
 * @param signer - Ethers signer (from provider.getSigner())
 * @returns Contract interaction functions and state
 *
 * @example
 * ```typescript
 * import { BrowserProvider } from 'ethers';
 *
 * function MyComponent() {
 *   const provider = new BrowserProvider(window.ethereum);
 *   const [signer, setSigner] = useState(null);
 *
 *   useEffect(() => {
 *     provider.getSigner().then(setSigner);
 *   }, [provider]);
 *
 *   const rbac = useRBACContract(provider, signer);
 *
 *   const checkPermission = async () => {
 *     const canCreate = await rbac.can(orgId, userAddress, Action.Create, Resource.Poll);
 *     console.log('Can create poll:', canCreate);
 *   };
 * }
 * ```
 */
export function useRBACContract(provider: Provider | null, signer: Signer | null): UseRBACContractReturn {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize contract when provider changes
  useEffect(() => {
    if (!provider) {
      setContract(null);
      return;
    }

    try {
      // Initialize contract with signer (for writes) or provider (for reads)
      const contractInstance = new Contract(
        RBAC_CONTRACT_ADDRESS,
        RBAC_ABI,
        signer || provider
      );

      setContract(contractInstance);
      setError(null);
      console.log('✅ RBAC Contract initialized:', RBAC_CONTRACT_ADDRESS);
      console.log('   With signer:', !!signer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize contract');
      setContract(null);
    }
  }, [provider, signer]);

  // Read functions

  const getOrganization = useCallback(async (orgId: string): Promise<Organization | null> => {
    if (!contract) {
      console.warn('Contract not initialized');
      return null;
    }

    try {
      setLoading(true);
      const org = await contract.getOrganization(orgId);
      return {
        id: org.id,
        name: org.name,
        owner: org.owner,
        createdAt: org.createdAt,
        memberCount: Number(org.memberCount),
        exists: org.exists
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get organization');
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const getUserRole = useCallback(async (orgId: string, userAddress: string): Promise<{ role: Role; hasRole: boolean }> => {
    if (!contract) {
      return { role: Role.Viewer, hasRole: false };
    }

    try {
      setLoading(true);
      const [role, hasRole] = await contract.getUserRole(orgId, userAddress);
      return { role: Number(role) as Role, hasRole };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get user role');
      return { role: Role.Viewer, hasRole: false };
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const getCredential = useCallback(async (orgId: string, userAddress: string): Promise<Credential | null> => {
    if (!contract) {
      return null;
    }

    try {
      setLoading(true);
      const cred = await contract.getCredential(orgId, userAddress);
      return {
        id: cred.id,
        orgId: cred.orgId,
        subject: cred.subject,
        role: Number(cred.role) as Role,
        issuedBy: cred.issuedBy,
        issuedAt: cred.issuedAt,
        expiresAt: cred.expiresAt,
        revoked: cred.revoked
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get credential');
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const hasPermission = useCallback(async (
    orgId: string,
    userAddress: string,
    action: Action,
    resource: Resource
  ): Promise<boolean> => {
    if (!contract) {
      return false;
    }

    try {
      const permission = await contract.hasPermission(orgId, userAddress, action, resource);
      return permission;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check permission');
      return false;
    }
  }, [contract]);

  const getOrganizationMembers = useCallback(async (orgId: string): Promise<string[]> => {
    if (!contract) {
      return [];
    }

    try {
      setLoading(true);
      const members = await contract.getOrganizationMembers(orgId);
      return members;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get organization members');
      return [];
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const getMemberCount = useCallback(async (orgId: string): Promise<number> => {
    if (!contract) {
      return 0;
    }

    try {
      const count = await contract.getMemberCount(orgId);
      return Number(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get member count');
      return 0;
    }
  }, [contract]);

  // Write functions (require signer)

  const createOrganization = useCallback(async (name: string): Promise<string> => {
    if (!contract || !signer) {
      throw new Error('Signer required to create organization');
    }

    try {
      setLoading(true);
      const tx = await contract.createOrganization(name);
      const receipt = await tx.wait();

      // Extract orgId from OrganizationCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'OrganizationCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed?.args[0]; // orgId
      }

      throw new Error('Organization created but ID not found in events');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create organization';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  const issueCredential = useCallback(async (
    orgId: string,
    subject: string,
    role: Role,
    expiresAt: number
  ): Promise<string> => {
    if (!contract || !signer) {
      throw new Error('Signer required to issue credential');
    }

    try {
      setLoading(true);
      const tx = await contract.issueCredential(orgId, subject, role, expiresAt);
      const receipt = await tx.wait();

      // Extract credentialId from CredentialIssued event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'CredentialIssued';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed?.args[0]; // credentialId
      }

      throw new Error('Credential issued but ID not found in events');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to issue credential';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  const revokeCredential = useCallback(async (orgId: string, subject: string): Promise<void> => {
    if (!contract || !signer) {
      throw new Error('Signer required to revoke credential');
    }

    try {
      setLoading(true);
      const tx = await contract.revokeCredential(orgId, subject);
      await tx.wait();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke credential';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  const updateRole = useCallback(async (orgId: string, subject: string, newRole: Role): Promise<void> => {
    if (!contract || !signer) {
      throw new Error('Signer required to update role');
    }

    try {
      setLoading(true);
      const tx = await contract.updateRole(orgId, subject, newRole);
      await tx.wait();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update role';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  // Helper function for permission checking (alias for hasPermission)
  const can = useCallback(async (
    orgId: string,
    userAddress: string,
    action: Action,
    resource: Resource
  ): Promise<boolean> => {
    return hasPermission(orgId, userAddress, action, resource);
  }, [hasPermission]);

  return {
    contract,
    loading,
    error,
    getOrganization,
    getUserRole,
    getCredential,
    hasPermission,
    getOrganizationMembers,
    getMemberCount,
    createOrganization,
    issueCredential,
    revokeCredential,
    updateRole,
    can
  };
}

// Export types and enums for convenience
export { Role, Action, Resource, roleToString, stringToRole };
export type { Organization, Credential };
