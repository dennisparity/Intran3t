/**
 * useDiscoveredUsers Hook
 *
 * Tracks all users who connect to the dapp. Identity comes from the host wallet — no People Chain queries.
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../providers/WalletProvider';

export interface DiscoveredUser {
  substrateAddress: string;
  evmAddress: string | null;
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
  const { selectedAccount } = useWallet();
  const [discoveredUsers, setDiscoveredUsers] = useState<DiscoveredUser[]>(loadDiscoveredUsers());
  const [loading, setLoading] = useState(false);

  // Auto-discover connected user
  useEffect(() => {
    if (!selectedAccount?.address) return;

    const substrateAddress = selectedAccount.address;
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

    // New user — track address only, no People Chain query
    const newUser: DiscoveredUser = {
      substrateAddress,
      evmAddress: null,
      discoveredAt: now,
      lastSeen: now,
    };
    const updated = [...discoveredUsers, newUser];
    setDiscoveredUsers(updated);
    saveDiscoveredUsers(updated);
  }, [selectedAccount?.address]);

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

      const now = new Date().toISOString();

      const newUser: DiscoveredUser = {
        substrateAddress,
        evmAddress: null,
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
