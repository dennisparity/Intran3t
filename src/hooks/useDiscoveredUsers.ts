/**
 * useDiscoveredUsers Hook
 *
 * Tracks all users who connect to the dapp and enriches them with People Chain identity data
 */

import { useState, useEffect, useCallback } from 'react';
import { useTypink } from 'typink';
import { queryOnChainIdentity, type IdentityInfo } from '../modules/profile/identity-helpers';

export interface DiscoveredUser {
  substrateAddress: string;
  evmAddress: string | null;
  identity: IdentityInfo | null;
  discoveredAt: string;
  lastSeen: string;
}

const STORAGE_KEY = 'intran3t_discovered_users';

/**
 * Load discovered users from localStorage
 */
function loadDiscoveredUsers(): DiscoveredUser[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save discovered users to localStorage
 */
function saveDiscoveredUsers(users: DiscoveredUser[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save discovered users:', error);
  }
}

/**
 * Hook to track and manage discovered users
 */
export function useDiscoveredUsers() {
  const { connectedAccount } = useTypink();
  const [discoveredUsers, setDiscoveredUsers] = useState<DiscoveredUser[]>(loadDiscoveredUsers());
  const [loading, setLoading] = useState(false);

  // Auto-discover connected user
  useEffect(() => {
    if (!connectedAccount?.address) return;

    const substrateAddress = connectedAccount.address;
    const now = new Date().toISOString();

    // Check if user already discovered
    const existing = discoveredUsers.find(u => u.substrateAddress === substrateAddress);

    if (existing) {
      // Update last seen time
      const updated = discoveredUsers.map(u =>
        u.substrateAddress === substrateAddress
          ? { ...u, lastSeen: now }
          : u
      );
      setDiscoveredUsers(updated);
      saveDiscoveredUsers(updated);
      return;
    }

    // New user - discover and enrich with identity
    setLoading(true);

    // Query identity from People Chain
    queryOnChainIdentity(substrateAddress).then(result => {
      const newUser: DiscoveredUser = {
        substrateAddress,
        evmAddress: null, // Will be enriched when EVM connects
        identity: result.success ? result.identity || null : null,
        discoveredAt: now,
        lastSeen: now,
      };

      const updated = [...discoveredUsers, newUser];
      setDiscoveredUsers(updated);
      saveDiscoveredUsers(updated);

      console.log('✅ User discovered:', substrateAddress);
      if (result.success && result.identity) {
        console.log('   Identity:', result.identity.display);
      }
    }).catch(error => {
      console.error('Failed to query identity:', error);

      // Add user anyway without identity
      const newUser: DiscoveredUser = {
        substrateAddress,
        evmAddress: null,
        identity: null,
        discoveredAt: now,
        lastSeen: now,
      };

      const updated = [...discoveredUsers, newUser];
      setDiscoveredUsers(updated);
      saveDiscoveredUsers(updated);
    }).finally(() => {
      setLoading(false);
    });
  }, [connectedAccount?.address]);

  /**
   * Manually add user by Substrate address
   */
  const addUserBySubstrateAddress = useCallback(async (substrateAddress: string): Promise<boolean> => {
    setLoading(true);

    try {
      // Check if already exists using functional state update
      let alreadyExists = false;
      setDiscoveredUsers(prev => {
        const existing = prev.find(u => u.substrateAddress === substrateAddress);
        if (existing) {
          alreadyExists = true;
        }
        return prev;
      });

      if (alreadyExists) {
        console.log('⚠️ User already exists:', substrateAddress);
        setLoading(false);
        return false;
      }

      console.log('🔍 Querying People Chain identity for:', substrateAddress);
      const result = await queryOnChainIdentity(substrateAddress);
      const now = new Date().toISOString();

      const newUser: DiscoveredUser = {
        substrateAddress,
        evmAddress: null,
        identity: result.success ? result.identity || null : null,
        discoveredAt: now,
        lastSeen: now,
      };

      console.log('✅ Adding new user:', newUser);

      // Use functional update to ensure we have latest state
      setDiscoveredUsers(prev => {
        const updated = [...prev, newUser];
        saveDiscoveredUsers(updated);
        return updated;
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to add user:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Link EVM address to existing user
   */
  const linkEvmAddress = useCallback((substrateAddress: string, evmAddress: string) => {
    setDiscoveredUsers(prev => {
      const updated = prev.map(u =>
        u.substrateAddress === substrateAddress
          ? { ...u, evmAddress }
          : u
      );
      saveDiscoveredUsers(updated);
      return updated;
    });
  }, []);

  /**
   * Remove user from discovered list
   */
  const removeUser = useCallback((substrateAddress: string) => {
    setDiscoveredUsers(prev => {
      const updated = prev.filter(u => u.substrateAddress !== substrateAddress);
      saveDiscoveredUsers(updated);
      return updated;
    });
  }, []);

  /**
   * Clear all discovered users
   */
  const clearAll = useCallback(() => {
    setDiscoveredUsers([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    discoveredUsers,
    loading,
    addUserBySubstrateAddress,
    linkEvmAddress,
    removeUser,
    clearAll,
  };
}
