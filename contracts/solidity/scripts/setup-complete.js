const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xF1152B54404F7F4B646199072Fd3819D097c4F94";
  const APHEXTWIN_H160 = "0xed041713db3374bac7b4963c574739fdc5da3604";
  const ORG_NAME = "Parity Technologies";

  console.log("=".repeat(60));
  console.log("Complete Organization Setup");
  console.log("=".repeat(60));
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Org Name: ${ORG_NAME}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeployer: ${deployer.address}`);
  console.log(`Aphextwin H160: ${APHEXTWIN_H160}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} PAS`);

  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");
  const rbac = Intran3tRBAC.attach(CONTRACT_ADDRESS);

  // Step 1: Create Organization
  console.log("\n" + "-".repeat(60));
  console.log("Step 1: Creating Organization...");
  console.log("-".repeat(60));

  const createTx = await rbac.createOrganization(ORG_NAME);
  console.log(`Transaction: ${createTx.hash}`);

  const createReceipt = await createTx.wait();
  console.log(`✅ Confirmed in block ${createReceipt.blockNumber}`);

  // Extract orgId
  let orgId = null;
  for (const log of createReceipt.logs) {
    try {
      const parsed = rbac.interface.parseLog(log);
      if (parsed?.name === 'OrganizationCreated') {
        orgId = parsed.args[0];
        console.log(`\n📋 Organization Created:`);
        console.log(`   Org ID: ${orgId}`);
        console.log(`   Owner: ${parsed.args[1]}`);
        console.log(`   Name: ${parsed.args[2]}`);
        break;
      }
    } catch (e) {}
  }

  if (!orgId) {
    console.log("❌ Could not extract org ID");
    process.exit(1);
  }

  // Verify org exists
  const org = await rbac.getOrganization(orgId);
  console.log(`\n   Exists: ${org.exists}`);
  console.log(`   Members: ${org.memberCount}`);

  // Step 2: Grant Admin to Aphextwin
  console.log("\n" + "-".repeat(60));
  console.log("Step 2: Granting Admin to Aphextwin...");
  console.log("-".repeat(60));
  console.log(`Target: ${APHEXTWIN_H160}`);

  const grantTx = await rbac.issueCredential(
    orgId,
    APHEXTWIN_H160,
    0,  // Role.Admin = 0
    0   // expiresAt = 0 (no expiration)
  );
  console.log(`Transaction: ${grantTx.hash}`);

  const grantReceipt = await grantTx.wait();
  console.log(`✅ Confirmed in block ${grantReceipt.blockNumber}`);

  // Verify
  const [role, hasRole] = await rbac.getUserRole(orgId, APHEXTWIN_H160);
  console.log(`\n📋 Verification:`);
  console.log(`   Address: ${APHEXTWIN_H160}`);
  console.log(`   Role: ${role === 0n ? 'Admin' : role === 1n ? 'Member' : 'Viewer'}`);
  console.log(`   Has Role: ${hasRole}`);

  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("Setup Complete!");
  console.log("=".repeat(60));
  console.log(`\n📋 Organization ID (save this!):`);
  console.log(`   ${orgId}`);
  console.log(`\n👤 Admins:`);
  console.log(`   1. ${deployer.address} (deployer)`);
  console.log(`   2. ${APHEXTWIN_H160} (aphextwin)`);
  console.log(`\n📝 Update your .env with:`);
  console.log(`   VITE_DEFAULT_ORG_ID=${orgId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
