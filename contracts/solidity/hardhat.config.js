require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 1337
    },
    // Polkadot Hub TestNet (Updated January 2026)
    // Docs: https://docs.polkadot.com/smart-contracts/connect/
    polkadotHubTestnet: {
      url: process.env.POLKADOT_HUB_TESTNET_RPC || "https://services.polkadothub-rpc.com/testnet",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420417, // Polkadot Hub TestNet chain ID
    },
    // Legacy alias for backwards compatibility
    assetHubTestnet: {
      url: process.env.POLKADOT_HUB_TESTNET_RPC || "https://services.polkadothub-rpc.com/testnet",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420417, // Polkadot Hub TestNet chain ID
    },
    // Kusama Hub (Production)
    kusamaHub: {
      url: process.env.KUSAMA_HUB_RPC || "https://kusama-asset-hub-eth-rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420418, // Kusama Hub chain ID
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
