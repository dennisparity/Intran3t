const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xF1152B54404F7F4B646199072Fd3819D097c4F94";
  const ORG_NAME = process.env.ORG_NAME || "Parity Technologies";

  console.log("Creating organization...");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Org Name: ${ORG_NAME}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} PAS`);

  // Get contract
  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");
  const rbac = Intran3tRBAC.attach(CONTRACT_ADDRESS);

  console.log("\n📝 Sending createOrganization transaction...");

  try {
    // Call createOrganization - get the transaction
    const tx = await rbac.createOrganization(ORG_NAME);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`🔗 View on explorer: https://polkadot.testnet.routescan.io/tx/${tx.hash}`);

    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log(`\n✅ Transaction confirmed!`);
    console.log(`Block: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
    console.log(`Logs: ${receipt.logs.length}`);

    // Print all logs
    console.log("\n📋 Transaction logs:");
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\nLog ${i}:`);
      console.log(`  Address: ${log.address}`);
      console.log(`  Topics: ${log.topics}`);
      console.log(`  Data: ${log.data}`);

      // Try to decode
      try {
        const parsed = rbac.interface.parseLog(log);
        if (parsed) {
          console.log(`  Event: ${parsed.name}`);
          console.log(`  Args: ${JSON.stringify(parsed.args, (k, v) => typeof v === 'bigint' ? v.toString() : v)}`);

          if (parsed.name === 'OrganizationCreated') {
            console.log(`\n🎉 Organization Created!`);
            console.log(`   Org ID: ${parsed.args[0]}`);
            console.log(`   Owner: ${parsed.args[1]}`);
            console.log(`   Name: ${parsed.args[2]}`);
            console.log(`\n📝 Add to your .env:`);
            console.log(`   VITE_DEFAULT_ORG_ID=${parsed.args[0]}`);
          }
        }
      } catch (e) {
        console.log(`  (Could not decode: ${e.message})`);
      }
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);

    // If it's a revert, try to get more info
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
