import { configVariable } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatIgnitionViem from "@nomicfoundation/hardhat-ignition-viem";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";

export default {
  plugins: [hardhatViem, hardhatIgnitionViem, hardhatNodeTestRunner],

  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },

  networks: {
    polkadotHubTestnet: {
      type: "http",
      url: "https://services.polkadothub-rpc.com/testnet",
      chainId: 420420417,
      accounts: [configVariable("PRIVATE_KEY")],
    },
    kusamaHub: {
      type: "http",
      url: "https://kusama-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420418,
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
