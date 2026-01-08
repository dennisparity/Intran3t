const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testnet-passet-hub-eth-rpc.polkadot.io");

  // Your deployer address
  const address = "0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62";

  try {
    const balance = await provider.getBalance(address);
    console.log(`Balance: ${ethers.formatEther(balance)} PAS`);

    if (balance === 0n) {
      console.log("\n⚠️  No balance! Get PAS tokens from:");
      console.log("   https://faucet.polkadot.io/?parachain=1111");
    }
  } catch (error) {
    console.error("Error checking balance:", error.message);
  }
}

main();
