// Contract addresses and network configuration for Intran3t

export type NetworkConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  formsContract: string;
  daoContract: string;
};

// Paseo Asset Hub Testnet (v2 endpoints — v1 retired 2026-05-20)
export const paseoNetwork: NetworkConfig = {
  chainId: 420420417,
  name: "Paseo Asset Hub",
  rpcUrl: "https://eth-rpc-testnet.polkadot.io",
  formsContract: "0xe2F988c1aD2533F473265aCD9C0699bE47643316",
  daoContract: "0xFa267e14B30B912bf1C530934027FA4B1C77bCC8",
};

// Current active network
export const activeNetwork: NetworkConfig = paseoNetwork;

// Helper to get contract address
export function getFormsContractAddress(): string {
  return activeNetwork.formsContract;
}

export function getDaoContractAddress(): string {
  return activeNetwork.daoContract;
}
