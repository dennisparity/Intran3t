const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xF1152B54404F7F4B646199072Fd3819D097c4F94";
  const ORG_ID = "0xe1638a84f161c8fc20c5672e4a159c35d9b3bd4f33f5476c8948e1c2789a2dc2";
  const NEW_ADMIN = "0xed041713db3374bac7b4963c574739fdc5da3604";

  console.log("Checking organization and granting admin...");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Org ID: ${ORG_ID}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");
  const rbac = Intran3tRBAC.attach(CONTRACT_ADDRESS);

  // Check org details
  console.log("\n📋 Getting organization details...");
  try {
    const org = await rbac.getOrganization(ORG_ID);
    console.log("Organization:", org);
    console.log("  Name:", org.name);
    console.log("  Owner:", org.owner);
    console.log("  Exists:", org.exists);
    console.log("  Member Count:", org.memberCount?.toString());
  } catch (e) {
    console.log("Error getting org:", e.message);
  }

  // Check deployer's role
  console.log("\n👤 Checking deployer's role...");
  try {
    const [role, hasRole] = await rbac.getUserRole(ORG_ID, deployer.address);
    console.log("  Role:", role.toString());
    console.log("  Has Role:", hasRole);
  } catch (e) {
    console.log("Error:", e.message);
  }

  // Grant admin to new address
  console.log("\n🔑 Granting Admin to:", NEW_ADMIN);
  try {
    const tx = await rbac.issueCredential(
      ORG_ID,
      NEW_ADMIN,
      0,  // Role.Admin = 0
      0   // expiresAt = 0 (no expiration)
    );
    console.log("Transaction:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Admin granted! Block:", receipt.blockNumber);

    // Verify
    const [newRole, newHasRole] = await rbac.getUserRole(ORG_ID, NEW_ADMIN);
    console.log("\n📋 Verification:");
    console.log("  Role:", newRole.toString(), "(0=Admin)");
    console.log("  Has Role:", newHasRole);
  } catch (e) {
    console.log("Error granting admin:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
