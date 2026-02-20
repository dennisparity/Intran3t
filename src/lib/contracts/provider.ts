import { ethers } from "ethers";
import { activeNetwork } from "./config";

let providerInstance: ethers.JsonRpcProvider | null = null;

/**
 * Get or create the JSON-RPC provider
 */
export function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(activeNetwork.rpcUrl);
  }
  return providerInstance;
}

/**
 * Get a signer from browser wallet (MetaMask, etc.)
 * Automatically switches to the correct network if needed
 */
export async function getBrowserSigner(): Promise<ethers.Signer | null> {
  if (typeof window === "undefined") {
    console.warn("Not in browser environment");
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    console.warn("No browser wallet detected");
    return null;
  }

  const provider = new ethers.BrowserProvider(ethereum);
  await provider.send("eth_requestAccounts", []);

  // Check if we're on the correct network
  const network = await provider.getNetwork();
  const currentChainId = Number(network.chainId);

  if (currentChainId !== activeNetwork.chainId) {
    console.log(`[Provider] Wrong network: ${currentChainId}, switching to ${activeNetwork.chainId}`);
    try {
      // Try to switch to the network
      await provider.send("wallet_switchEthereumChain", [
        { chainId: `0x${activeNetwork.chainId.toString(16)}` }
      ]);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        console.log("[Provider] Network not in MetaMask, adding it...");
        await provider.send("wallet_addEthereumChain", [
          {
            chainId: `0x${activeNetwork.chainId.toString(16)}`,
            chainName: activeNetwork.name,
            rpcUrls: [activeNetwork.rpcUrl],
            nativeCurrency: {
              name: "PAS",
              symbol: "PAS",
              decimals: 18,
            },
          },
        ]);
      } else {
        throw switchError;
      }
    }
  }

  return provider.getSigner();
}

/**
 * Get a signer from private key
 * For form creators who provide their mnemonic/private key
 */
export function getPrivateKeySigner(privateKey: string): ethers.Wallet {
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Check if connected to expected network
 */
export async function isCorrectNetwork(): Promise<boolean> {
  const provider = getProvider();
  const network = await provider.getNetwork();
  return Number(network.chainId) === activeNetwork.chainId;
}
