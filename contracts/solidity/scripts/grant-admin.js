const hre = require("hardhat");

async function main() {
  // Configuration
  const CONTRACT_ADDRESS = "0xF1152B54404F7F4B646199072Fd3819D097c4F94";

  // Dennis's derived H160 address from Substrate account
  // SS58: 167jTxA5TBuSXVCiJcCoLSHe5Nekp4uMTzHDRXjPxSNV2SJS
  const NEW_ADMIN_ADDRESS = "0xed041713db3374bac7b4963c574739fdc5da3604";

  // Organization ID - you'll need to provide this
  // Get it from your createOrganization transaction or contract state
  const ORG_ID = process.env.ORG_ID;

  if (!ORG_ID) {
    console.log("\n❌ Please provide ORG_ID environment variable");
    console.log("\nTo find your org ID:");
    console.log("1. Check your organization creation transaction");
    console.log("2. Or query the contract for organizations you've created");
    console.log("\nExample: ORG_ID=0x1234... npx hardhat run scripts/grant-admin.js --network polkadotHubTestnet");
    process.exit(1);
  }

  console.log("Granting Admin role to Substrate-derived address...");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`New Admin: ${NEW_ADMIN_ADDRESS}`);
  console.log(`Org ID: ${ORG_ID}`);

  // Get deployer (current admin)
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nUsing deployer: ${deployer.address}`);

  // Get contract instance
  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");
  const rbac = Intran3tRBAC.attach(CONTRACT_ADDRESS);

  // Check if org exists
  const org = await rbac.getOrganization(ORG_ID);
  if (!org.exists) {
    console.log("\n❌ Organization not found. Check your ORG_ID.");
    process.exit(1);
  }
  console.log(`\nOrganization: ${org.name}`);
  console.log(`Owner: ${org.owner}`);
  console.log(`Members: ${org.memberCount}`);

  // Check if deployer is admin
  const [deployerRole, hasRole] = await rbac.getUserRole(ORG_ID, deployer.address);
  if (!hasRole || deployerRole !== 0n) { // 0 = Admin
    console.log("\n❌ Deployer is not an Admin of this organization");
    process.exit(1);
  }
  console.log(`Deployer role: Admin ✓`);

  // Check if new admin already has a role
  const [newAdminRole, newAdminHasRole] = await rbac.getUserRole(ORG_ID, NEW_ADMIN_ADDRESS);
  if (newAdminHasRole) {
    console.log(`\n⚠️  Address already has role: ${newAdminRole === 0n ? 'Admin' : newAdminRole === 1n ? 'Member' : 'Viewer'}`);

    if (newAdminRole === 0n) {
      console.log("Already an Admin, no action needed.");
      process.exit(0);
    }

    // Update to Admin
    console.log("\nUpdating role to Admin...");
    const updateTx = await rbac.updateRole(ORG_ID, NEW_ADMIN_ADDRESS, 0); // 0 = Admin
    await updateTx.wait();
    console.log("✅ Role updated to Admin");
  } else {
    // Issue new Admin credential
    console.log("\nIssuing Admin credential...");
    const tx = await rbac.issueCredential(
      ORG_ID,
      NEW_ADMIN_ADDRESS,
      0,  // Role.Admin = 0
      0   // expiresAt = 0 (no expiration)
    );

    const receipt = await tx.wait();
    console.log(`\n✅ Admin credential issued!`);
    console.log(`Transaction: ${receipt.hash}`);
  }

  // Verify
  const [verifyRole, verifyHasRole] = await rbac.getUserRole(ORG_ID, NEW_ADMIN_ADDRESS);
  console.log(`\nVerification:`);
  console.log(`Address: ${NEW_ADMIN_ADDRESS}`);
  console.log(`Role: ${verifyRole === 0n ? 'Admin' : verifyRole === 1n ? 'Member' : 'Viewer'}`);
  console.log(`Has Role: ${verifyHasRole}`);

  console.log("\n📋 Next steps:");
  console.log("1. Your Substrate account can now manage this organization");
  console.log("2. You may need to call 'map_account' on Polkadot Hub to initiate EVM transactions");
  console.log("3. Test by connecting with Talisman in EVM mode");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
