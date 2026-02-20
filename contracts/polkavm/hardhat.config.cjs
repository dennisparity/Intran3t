require('dotenv').config({ path: '../../.env' });
const { vars } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");

const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable IR-based code generation
    },
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 31337,
    },
    // Paseo Asset Hub Testnet
    paseoAssetHub: {
      url: "https://eth-rpc-testnet.polkadot.io",
      chainId: 420420417,
      // Try .env first, then hardhat vars
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : (vars.has("PRIVATE_KEY") ? [vars.get("PRIVATE_KEY")] : []),
    },
  },
  // PolkaVM specific configuration
  polkavm: {
    // Use resolc compiler for PolkaVM bytecode
    compilerPath: require.resolve("@parity/resolc"),
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache-hardhat",
    artifacts: "./artifacts",
  },
};

module.exports = config;
