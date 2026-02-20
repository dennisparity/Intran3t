// Contract addresses and network configuration for Intran3t

export type NetworkConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  formsContract: string;
};

// Paseo Asset Hub Testnet
export const paseoNetwork: NetworkConfig = {
  chainId: 420420417,
  name: "Paseo Asset Hub",
  rpcUrl: "https://eth-rpc-testnet.polkadot.io",
  formsContract: "0xe2F988c1aD2533F473265aCD9C0699bE47643316", // Deployed 2026-02-19
};

// Current active network
export const activeNetwork: NetworkConfig = paseoNetwork;

// Helper to get contract address
export function getFormsContractAddress(): string {
  return activeNetwork.formsContract;
}
