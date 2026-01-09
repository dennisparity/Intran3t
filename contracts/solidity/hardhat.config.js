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
    // Polkadot Polkadot Hub EVM (testnet) - Paseo
    assetHubTestnet: {
      url: process.env.ASSET_HUB_TESTNET_RPC || "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420422, // Polkadot Hub Paseo testnet chain ID (actual)
    },
    // Polkadot Polkadot Hub EVM (mainnet)
    assetHubMainnet: {
      url: process.env.ASSET_HUB_MAINNET_RPC || "https://rpc.assethub.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1000, // Polkadot Hub mainnet chain ID
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
