const hre = require("hardhat");

async function main() {
  console.log("Deploying Intran3tRBAC contract...");

  // Get the contract factory
  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");

  // Deploy the contract
  const rbac = await Intran3tRBAC.deploy();

  await rbac.waitForDeployment();

  const address = await rbac.getAddress();

  console.log(`✅ Intran3tRBAC deployed to: ${address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${(await hre.ethers.getSigners())[0].address}`);

  // Wait for a few block confirmations before verification
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await rbac.deploymentTransaction().wait(6);

    console.log("Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: (await hre.ethers.getSigners())[0].address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  fs.writeFileSync(
    `./deployments/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`\n📝 Deployment info saved to deployments/${hre.network.name}.json`);
  console.log("\nNext steps:");
  console.log("1. Update CONTRACT_ADDRESS in your frontend code");
  console.log("2. Copy the contract ABI from artifacts/contracts/Intran3tRBAC.sol/Intran3tRBAC.json");
  console.log("3. Test the contract with: npx hardhat test");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
