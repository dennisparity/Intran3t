/**
 * useAccessPassContract Hook
 *
 * React hook for interacting with the Intran3t Access Pass ERC-721 contract
 */

import { useState, useEffect, useCallback } from 'react';
import { Contract, BrowserProvider, JsonRpcSigner } from 'ethers';
import {
  ACCESSPASS_CONTRACT_ADDRESS,
  ACCESSPASS_ABI,
  AccessPassMetadata,
  metadataToAccessPass,
  isPassExpired
} from '../contracts/intran3t-accesspass';

// Types
type Provider = BrowserProvider | null;
type Signer = JsonRpcSigner | null;

/**
 * Hook return type
 */
interface UseAccessPassContractReturn {
  // Contract instance
  contract: Contract | null;

  // Loading and error states
  loading: boolean;
  error: string | null;

  // Read functions
  getPassMetadata: (tokenId: number) => Promise<AccessPassMetadata | null>;
  isPassValid: (tokenId: number) => Promise<boolean>;
  getPassesByHolder: (holder: string) => Promise<number[]>;
  getPassesByLocation: (locationId: string) => Promise<number[]>;
  getTotalMinted: () => Promise<number>;
  getBalance: (owner: string) => Promise<number>;

  // Write functions (require signer)
  mintAccessPass: (
    to: string,
    location: string,
    locationId: string,
    expiresAt: number,
    accessLevel: string,
    identityDisplay: string
  ) => Promise<number>; // returns tokenId

  revokeAccessPass: (tokenId: number) => Promise<void>;
  grantMinterRole: (account: string) => Promise<void>;
  revokeMinterRole: (account: string) => Promise<void>;

  // Helper functions
  checkIfMinter: (account: string) => Promise<boolean>;
}

/**
 * React hook for Access Pass contract interaction
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
 *   const { provider, signer } = useEVM();
 *   const accessPass = useAccessPassContract(provider, signer);
 *
 *   const mintPass = async () => {
 *     const tokenId = await accessPass.mintAccessPass(
 *       userAddress,
 *       "Berlin Office",
 *       "berlin",
 *       Date.now() / 1000 + 86400, // 24 hours
 *       "standard",
 *       "John Doe"
 *     );
 *     console.log('Minted token ID:', tokenId);
 *   };
 * }
 * ```
 */
export function useAccessPassContract(provider: Provider | null, signer: Signer | null): UseAccessPassContractReturn {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize contract when provider changes
  useEffect(() => {
    if (!provider || !ACCESSPASS_CONTRACT_ADDRESS) {
      setContract(null);
      return;
    }

    try {
      // Initialize contract with signer (for writes) or provider (for reads)
      const contractInstance = new Contract(
        ACCESSPASS_CONTRACT_ADDRESS,
        ACCESSPASS_ABI,
        signer || provider
      );

      setContract(contractInstance);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize AccessPass contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize contract');
      setContract(null);
    }
  }, [provider, signer]);

  // ============ Read Functions ============

  const getPassMetadata = useCallback(async (tokenId: number): Promise<AccessPassMetadata | null> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      const metadata = await contract.getPassMetadata(tokenId);
      setError(null);
      return metadata;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get pass metadata';
      setError(errorMsg);
      console.error('getPassMetadata error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const isPassValid = useCallback(async (tokenId: number): Promise<boolean> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      const valid = await contract.isPassValid(tokenId);
      setError(null);
      return valid;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check pass validity';
      setError(errorMsg);
      console.error('isPassValid error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const getPassesByHolder = useCallback(async (holder: string): Promise<number[]> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      const tokenIds = await contract.getPassesByHolder(holder);
      setError(null);
      return tokenIds.map((id: bigint) => Number(id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get passes by holder';
      setError(errorMsg);
      console.error('getPassesByHolder error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const getPassesByLocation = useCallback(async (locationId: string): Promise<number[]> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      const tokenIds = await contract.getPassesByLocation(locationId);
      setError(null);
      return tokenIds.map((id: bigint) => Number(id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get passes by location';
      setError(errorMsg);
      console.error('getPassesByLocation error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const getTotalMinted = useCallback(async (): Promise<number> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      const total = await contract.totalMinted();
      setError(null);
      return Number(total);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get total minted';
      setError(errorMsg);
      console.error('getTotalMinted error:', err);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const getBalance = useCallback(async (owner: string): Promise<number> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      const balance = await contract.balanceOf(owner);
      setError(null);
      return Number(balance);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get balance';
      setError(errorMsg);
      console.error('getBalance error:', err);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // ============ Write Functions ============

  const mintAccessPass = useCallback(async (
    to: string,
    location: string,
    locationId: string,
    expiresAt: number,
    accessLevel: string,
    identityDisplay: string
  ): Promise<number> => {
    if (!contract || !signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      setLoading(true);
      const tx = await contract.mintAccessPass(
        to,
        location,
        locationId,
        Math.floor(expiresAt),
        accessLevel,
        identityDisplay
      );

      const receipt = await tx.wait();

      // Extract token ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed && parsed.name === 'AccessPassMinted';
        } catch (e) {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        const tokenId = Number(parsed!.args.tokenId);
        setError(null);
        return tokenId;
      }

      throw new Error('AccessPassMinted event not found in transaction');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mint access pass';
      setError(errorMsg);
      console.error('mintAccessPass error:', err);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  const revokeAccessPass = useCallback(async (tokenId: number): Promise<void> => {
    if (!contract || !signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      setLoading(true);
      const tx = await contract.revokeAccessPass(tokenId);
      await tx.wait();
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke access pass';
      setError(errorMsg);
      console.error('revokeAccessPass error:', err);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  const grantMinterRole = useCallback(async (account: string): Promise<void> => {
    if (!contract || !signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      setLoading(true);
      const tx = await contract.grantMinterRole(account);
      await tx.wait();
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to grant minter role';
      setError(errorMsg);
      console.error('grantMinterRole error:', err);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  const revokeMinterRole = useCallback(async (account: string): Promise<void> => {
    if (!contract || !signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      setLoading(true);
      const tx = await contract.revokeMinterRole(account);
      await tx.wait();
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke minter role';
      setError(errorMsg);
      console.error('revokeMinterRole error:', err);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [contract, signer]);

  // ============ Helper Functions ============

  const checkIfMinter = useCallback(async (account: string): Promise<boolean> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      // MINTER_ROLE hash
      const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
      const hasMinterRole = await contract.hasRole(MINTER_ROLE, account);
      setError(null);
      return hasMinterRole;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check minter role';
      setError(errorMsg);
      console.error('checkIfMinter error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  return {
    contract,
    loading,
    error,

    // Read functions
    getPassMetadata,
    isPassValid,
    getPassesByHolder,
    getPassesByLocation,
    getTotalMinted,
    getBalance,

    // Write functions
    mintAccessPass,
    revokeAccessPass,
    grantMinterRole,
    revokeMinterRole,

    // Helper functions
    checkIfMinter,
  };
}
