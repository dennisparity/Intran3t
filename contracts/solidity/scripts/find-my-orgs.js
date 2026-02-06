const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xF1152B54404F7F4B646199072Fd3819D097c4F94";

  console.log("Finding organizations...");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: ${hre.network.name}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Get contract
  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");
  const rbac = Intran3tRBAC.attach(CONTRACT_ADDRESS);

  // Query OrganizationCreated events
  console.log("\n🔍 Searching for OrganizationCreated events...");

  try {
    // Get all OrganizationCreated events where owner is deployer
    const filter = rbac.filters.OrganizationCreated(null, deployer.address);
    const events = await rbac.queryFilter(filter);

    console.log(`\nFound ${events.length} organization(s):\n`);

    for (const event of events) {
      const orgId = event.args[0];
      const owner = event.args[1];
      const name = event.args[2];

      console.log(`📋 Organization: ${name}`);
      console.log(`   Org ID: ${orgId}`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   Tx: ${event.transactionHash}`);

      // Get current org details
      try {
        const org = await rbac.getOrganization(orgId);
        console.log(`   Members: ${org.memberCount}`);
        console.log(`   Exists: ${org.exists}`);
      } catch (e) {
        console.log(`   (Could not fetch org details)`);
      }

      console.log('');
    }

    if (events.length > 0) {
      const latestOrgId = events[events.length - 1].args[0];
      console.log(`\n📝 Latest Org ID (copy this to .env):`);
      console.log(`   VITE_DEFAULT_ORG_ID=${latestOrgId}`);
    }
  } catch (e) {
    console.error("Error querying events:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
