/**
 * EVM Provider Context
 *
 * Manages EVM wallet connection for Polkadot Hub EVM interaction using Polkadot wallets
 * Supports: Polkadot.js Extension, Talisman, SubWallet, Nova Wallet (any wallet with EVM support)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTypink } from 'typink';
import { BrowserProvider, JsonRpcSigner, JsonRpcProvider } from 'ethers';

// Types
type Provider = BrowserProvider | null;
type Signer = JsonRpcSigner | null;

interface EVMContextValue {
  provider: Provider | null;
  signer: Signer | null;
  account: string | null;
  chainId: number | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  switchToAssetHub: () => Promise<void>;
}

const EVMContext = createContext<EVMContextValue | undefined>(undefined);

/**
 * Polkadot Hub EVM Chain Configuration (Updated Jan 2026)
 */
const ASSET_HUB_CHAIN_CONFIG = {
  testnet: {
    chainId: '0x1909B741', // 420420417 in decimal (Polkadot Hub TestNet)
    chainName: 'Polkadot Hub TestNet',
    rpcUrls: ['https://services.polkadothub-rpc.com/testnet'],
    blockExplorerUrls: ['https://polkadot.testnet.routescan.io'],
    nativeCurrency: {
      name: 'PAS',
      symbol: 'PAS',
      decimals: 18 // MetaMask requires 18; actual on-chain decimals are 10
    }
  },
  mainnet: {
    chainId: '0x1909B742', // 420420418 in decimal (Kusama Hub)
    chainName: 'Kusama Hub',
    rpcUrls: ['https://kusama-asset-hub-eth-rpc.polkadot.io'],
    blockExplorerUrls: ['https://kusama-asset-hub.subscan.io'],
    nativeCurrency: {
      name: 'KSM',
      symbol: 'KSM',
      decimals: 12
    }
  }
};

// Use testnet by default during development
const CURRENT_NETWORK = ASSET_HUB_CHAIN_CONFIG.testnet;

interface EVMProviderProps {
  children: ReactNode;
}

/**
 * EVM Provider Component
 *
 * Wraps the application to provide EVM wallet connection functionality using Polkadot wallets
 *
 * @example
 * ```tsx
 * import { EVMProvider } from './providers/EVMProvider';
 *
 * function App() {
 *   return (
 *     <EVMProvider>
 *       <YourApp />
 *     </EVMProvider>
 *   );
 * }
 * ```
 */
export function EVMProvider({ children }: EVMProviderProps) {
  const { connectedAccount, disconnect: disconnectPolkadot } = useTypink();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get EVM provider from Polkadot wallet
   * Checks for Talisman, SubWallet, etc. with EVM support
   */
  const getEVMProvider = () => {
    // Check for window.ethereum (injected by Polkadot wallets with EVM support)
    const ethereum = (window as any).ethereum;
    if (ethereum) return ethereum;

    // Check for injectedWeb3 (Polkadot extension format)
    const injectedWeb3 = (window as any).injectedWeb3;
    if (injectedWeb3) {
      // Try common wallet names that support EVM
      const wallets = ['talisman', 'subwallet-js', 'nova'];
      for (const wallet of wallets) {
        if (injectedWeb3[wallet]?.ethereum) {
          return injectedWeb3[wallet].ethereum;
        }
      }
    }

    return null;
  };

  /**
   * Initialize provider when Polkadot wallet with EVM support is available
   */
  useEffect(() => {
    const ethereum = getEVMProvider();

    if (!ethereum) {
      setError('No EVM-compatible Polkadot wallet found. Please use Polkadot.js Extension, Talisman, SubWallet, or Nova Wallet.');
      return;
    }

    try {
      const web3Provider = new BrowserProvider(ethereum);
      setProvider(web3Provider);
      setError(null);

      // Listen for account changes
      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
          web3Provider.getSigner().then(setSigner);
        }
      });

      // Listen for chain changes
      ethereum.on('chainChanged', (newChainId: string) => {
        setChainId(parseInt(newChainId, 16));
        // Reload the page as recommended
        window.location.reload();
      });

      // Check if already connected and auto-initialize signer
      ethereum.request({ method: 'eth_accounts' }).then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          // Skip auto-connect if user explicitly disconnected
          if (localStorage.getItem('evm_explicitly_disconnected')) {
            console.log('⏭️ Skipping EVM auto-connect (explicitly disconnected)');
            return;
          }
          console.log('✅ EVM accounts found, auto-initializing...');
          setAccount(accounts[0]);
          setConnected(true);

          try {
            const web3Signer = await web3Provider.getSigner(accounts[0]);
            setSigner(web3Signer);
            console.log('   ✅ Signer auto-initialized for:', accounts[0]);
          } catch (err) {
            console.error('Failed to initialize signer:', err);
          }

          ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
            setChainId(parseInt(chainId, 16));
            console.log('   ✅ Chain ID:', parseInt(chainId, 16));
          });
        }
      }).catch(err => {
        console.warn('No existing EVM connection');
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize EVM provider');
    }
  }, []);

  /**
   * Connect to Polkadot wallet's EVM capability
   */
  const connect = async () => {
    localStorage.removeItem('evm_explicitly_disconnected');
    console.log('🔌 Attempting EVM connection...');
    const ethereum = getEVMProvider();

    console.log('   window.ethereum:', (window as any).ethereum);
    console.log('   window.ethereum.isTalisman:', (window as any).ethereum?.isTalisman);
    console.log('   window.injectedWeb3:', Object.keys((window as any).injectedWeb3 || {}));
    console.log('   Found EVM provider:', ethereum);

    if (!ethereum) {
      const errorMsg = 'No EVM provider found. Make sure Talisman has Ethereum accounts enabled (Settings → Networks & Tokens → Ethereum).';
      console.error('❌', errorMsg);
      setError(errorMsg);
      return;
    }

    // Initialize provider if not yet done (race condition fix)
    let activeProvider = provider;
    if (!activeProvider) {
      console.log('   ⚠️ Provider not initialized, initializing now...');
      try {
        activeProvider = new BrowserProvider(ethereum);
        setProvider(activeProvider);
        console.log('   ✅ Provider initialized');
      } catch (err) {
        const errorMsg = 'Failed to initialize EVM provider';
        console.error('❌', errorMsg, err);
        setError(errorMsg);
        return;
      }
    }

    try {
      setConnecting(true);
      setError(null);

      console.log('📞 Requesting EVM accounts from wallet...');
      console.log('   ⏳ Waiting for wallet popup - check if popup appeared!');

      // First check what accounts are already available
      const existingAccounts = await ethereum.request({ method: 'eth_accounts' });
      console.log('   Existing accounts:', existingAccounts);

      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      console.log('   ✅ Received accounts:', accounts);

      if (accounts.length === 0) {
        const errorMsg = 'No EVM accounts returned. In Talisman: Settings → Networks & Tokens → Enable Ethereum, then create/import an Ethereum account.';
        console.error('❌', errorMsg);
        setError(errorMsg);
        setConnecting(false);
        return;
      }

      if (accounts.length > 0) {
        const accountAddress = accounts[0];
        console.log('   📝 Setting account:', accountAddress);
        setAccount(accountAddress);
        setConnected(true);

        // Get signer for the connected account
        console.log('   🖊️  Getting signer...');
        const web3Signer = await activeProvider.getSigner(accountAddress);
        setSigner(web3Signer);
        console.log('   ✅ Signer initialized for account:', accountAddress);

        const network = await activeProvider.getNetwork();
        setChainId(Number(network.chainId));
        console.log('✅ Connected to network:', network.chainId);

        // Prompt to switch to Polkadot Hub if not already
        if (Number(network.chainId) !== parseInt(CURRENT_NETWORK.chainId, 16)) {
          console.log('⚠️ Wrong network, switching to Polkadot Hub TestNet...');
          try {
            await switchToAssetHub();
          } catch (switchErr) {
            console.warn('Chain switch failed, but account is connected:', switchErr);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Disconnect wallet
   */
  const disconnect = () => {
    setAccount(null);
    setSigner(null);
    setConnected(false);
    setError(null);
    localStorage.setItem('evm_explicitly_disconnected', 'true');
  };

  /**
   * Switch to Polkadot Hub EVM network
   */
  const switchToAssetHub = async () => {
    const ethereum = getEVMProvider();

    if (!ethereum) {
      setError('No EVM-compatible Polkadot wallet found');
      return;
    }

    try {
      // Try to switch to the network
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CURRENT_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to the wallet
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CURRENT_NETWORK],
          });
        } catch (addError) {
          setError('Failed to add Polkadot Hub network to wallet');
          throw addError;
        }
      } else {
        setError('Failed to switch to Polkadot Hub network');
        throw switchError;
      }
    }
  };

  const value: EVMContextValue = {
    provider,
    signer,
    account,
    chainId,
    connected,
    connecting,
    error,
    connect,
    disconnect,
    switchToAssetHub
  };

  return <EVMContext.Provider value={value}>{children}</EVMContext.Provider>;
}

/**
 * Hook to use EVM context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { connect, connected, account } = useEVM();
 *
 *   return (
 *     <div>
 *       {connected ? (
 *         <p>Connected: {account}</p>
 *       ) : (
 *         <button onClick={connect}>Connect Wallet (EVM)</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEVM(): EVMContextValue {
  const context = useContext(EVMContext);

  if (context === undefined) {
    throw new Error('useEVM must be used within an EVMProvider');
  }

  return context;
}
