const { ethers } = require("hardhat");

async function main() {
  const RBAC_ADDRESS = "0xfde4dD5d4e31adDe12123b214D81c43b04921760";
  const DEPLOYER = "0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62";

  // Get contract instance
  const rbac = await ethers.getContractAt("Intran3tRBAC", RBAC_ADDRESS);

  console.log("🔍 Verifying RBAC Contract State\n");
  console.log("Contract:", RBAC_ADDRESS);
  console.log("Deployer:", DEPLOYER);
  console.log();

  // The orgId from localStorage should be provided as argument
  // For now, let's try to find organizations by querying events
  console.log("📋 Checking for OrganizationCreated events...\n");

  try {
    const filter = rbac.filters.OrganizationCreated();
    const events = await rbac.queryFilter(filter, 0, "latest");

    if (events.length === 0) {
      console.log("❌ No organizations found!");
      console.log("   The deployer needs to create an organization first.");
      return;
    }

    console.log(`✅ Found ${events.length} organization(s):\n`);

    for (const event of events) {
      const orgId = event.args[0];
      const owner = event.args[1];
      const name = event.args[2];

      console.log(`Organization: "${name}"`);
      console.log(`  Org ID: ${orgId}`);
      console.log(`  Owner: ${owner}`);

      // Get organization details
      const org = await rbac.getOrganization(orgId);
      console.log(`  Member Count: ${org.memberCount}`);
      console.log(`  Exists: ${org.exists}`);

      // Check deployer's role
      const [role, hasRole] = await rbac.getUserRole(orgId, DEPLOYER);
      console.log(`  Deployer's Role: ${hasRole ? getRoleName(role) : 'None'}`);
      console.log(`  Has Role: ${hasRole}`);

      // Get deployer's full credential
      const cred = await rbac.getCredential(orgId, DEPLOYER);
      if (cred.subject !== ethers.ZeroAddress) {
        console.log(`  Credential ID: ${cred.id}`);
        console.log(`  Issued By: ${cred.issuedBy}`);
        console.log(`  Revoked: ${cred.revoked}`);
      }

      console.log();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

function getRoleName(role) {
  const roles = ["Admin", "Member", "Viewer", "PeopleCulture"];
  return roles[role] || "Unknown";
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
