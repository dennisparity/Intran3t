const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xF1152B54404F7F4B646199072Fd3819D097c4F94";

  console.log("Checking contract state...");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: ${hre.network.name}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} PAS`);

  // Get contract
  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");
  const rbac = Intran3tRBAC.attach(CONTRACT_ADDRESS);

  // Check if contract is accessible
  try {
    const code = await hre.ethers.provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.log("\n❌ No contract at this address!");
      return;
    }
    console.log(`\n✅ Contract deployed (${code.length} bytes of bytecode)`);
  } catch (e) {
    console.log("\n❌ Error checking contract:", e.message);
    return;
  }

  // The contract doesn't have a way to enumerate all orgs,
  // but we can check if deployer has any credentials by trying known org IDs
  // or by looking at events

  console.log("\n📊 To find your Organization ID:");
  console.log("1. Check your 'createOrganization' transaction on the block explorer");
  console.log("2. Look for OrganizationCreated event in the transaction logs");
  console.log("3. The 'orgId' is the first indexed parameter (bytes32)");
  console.log("\nBlock Explorer: https://polkadot.testnet.routescan.io/");
  console.log(`Contract page: https://polkadot.testnet.routescan.io/address/${CONTRACT_ADDRESS}`);

  // Try to get recent events (if the provider supports it)
  console.log("\n🔍 Checking for OrganizationCreated events from deployer...");

  try {
    // Create event filter
    const filter = rbac.filters.OrganizationCreated(null, deployer.address);
    const events = await rbac.queryFilter(filter);

    if (events.length > 0) {
      console.log(`\nFound ${events.length} organization(s) created by deployer:\n`);
      for (const event of events) {
        const orgId = event.args[0];
        const name = event.args[2];
        console.log(`  Org Name: ${name}`);
        console.log(`  Org ID: ${orgId}`);
        console.log(`  Block: ${event.blockNumber}`);
        console.log(`  Tx: ${event.transactionHash}`);

        // Get org details
        const org = await rbac.getOrganization(orgId);
        console.log(`  Members: ${org.memberCount}`);
        console.log('');
      }
    } else {
      console.log("\nNo organizations found for deployer address.");
      console.log("You may need to create an organization first.");
    }
  } catch (e) {
    console.log("\nCouldn't query events:", e.message);
    console.log("Check the block explorer manually.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
