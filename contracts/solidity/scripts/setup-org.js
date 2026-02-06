const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xF1152B54404F7F4B646199072Fd3819D097c4F94";

  // Dennis's Substrate-derived H160 address
  // SS58: 167jTxA5TBuSXVCiJcCoLSHe5Nekp4uMTzHDRXjPxSNV2SJS
  const SUBSTRATE_H160 = "0xed041713db3374bac7b4963c574739fdc5da3604";

  // Organization name - customize this
  const ORG_NAME = process.env.ORG_NAME || "Parity Technologies";

  console.log("=".repeat(60));
  console.log("Intran3t Organization Setup");
  console.log("=".repeat(60));
  console.log(`\nContract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Org Name: ${ORG_NAME}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeployer (EVM): ${deployer.address}`);
  console.log(`Substrate H160: ${SUBSTRATE_H160}`);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} PAS`);

  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("\n❌ Insufficient balance. Need at least 0.1 PAS for gas.");
    process.exit(1);
  }

  // Get contract
  const Intran3tRBAC = await hre.ethers.getContractFactory("Intran3tRBAC");
  const rbac = Intran3tRBAC.attach(CONTRACT_ADDRESS);

  // Step 1: Create Organization
  console.log("\n" + "-".repeat(60));
  console.log("Step 1: Creating Organization...");
  console.log("-".repeat(60));

  const createTx = await rbac.createOrganization(ORG_NAME);
  console.log(`Transaction sent: ${createTx.hash}`);

  const createReceipt = await createTx.wait();
  console.log(`✅ Transaction confirmed in block ${createReceipt.blockNumber}`);

  // Extract orgId from event logs
  let orgId;
  for (const log of createReceipt.logs) {
    try {
      const parsed = rbac.interface.parseLog(log);
      if (parsed && parsed.name === 'OrganizationCreated') {
        orgId = parsed.args[0];
        console.log(`\n📋 Organization Created:`);
        console.log(`   Name: ${ORG_NAME}`);
        console.log(`   Org ID: ${orgId}`);
        console.log(`   Owner: ${parsed.args[1]}`);
        break;
      }
    } catch (e) {
      // Skip logs that aren't from our contract
    }
  }

  if (!orgId) {
    console.log("\n❌ Couldn't extract Org ID from logs");
    console.log("Check transaction on block explorer:");
    console.log(`https://polkadot.testnet.routescan.io/tx/${createReceipt.hash}`);
    process.exit(1);
  }

  // Verify organization
  const org = await rbac.getOrganization(orgId);
  console.log(`\n   Members: ${org.memberCount}`);
  console.log(`   Created: ${new Date(Number(org.createdAt) * 1000).toISOString()}`);

  // Step 2: Grant Admin to Substrate Account
  console.log("\n" + "-".repeat(60));
  console.log("Step 2: Granting Admin to Substrate Account...");
  console.log("-".repeat(60));
  console.log(`Target: ${SUBSTRATE_H160}`);

  const grantTx = await rbac.issueCredential(
    orgId,
    SUBSTRATE_H160,
    0,  // Role.Admin = 0
    0   // expiresAt = 0 (no expiration)
  );
  console.log(`Transaction sent: ${grantTx.hash}`);

  const grantReceipt = await grantTx.wait();
  console.log(`✅ Admin credential issued in block ${grantReceipt.blockNumber}`);

  // Verify
  const [role, hasRole] = await rbac.getUserRole(orgId, SUBSTRATE_H160);
  console.log(`\n📋 Credential Verified:`);
  console.log(`   Address: ${SUBSTRATE_H160}`);
  console.log(`   Role: ${role === 0n ? 'Admin' : role === 1n ? 'Member' : 'Viewer'}`);
  console.log(`   Has Role: ${hasRole}`);

  // Get final member count
  const finalOrg = await rbac.getOrganization(orgId);
  console.log(`\n   Total Members: ${finalOrg.memberCount}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Setup Complete!");
  console.log("=".repeat(60));
  console.log(`\n📋 Organization ID (save this!):`);
  console.log(`   ${orgId}`);
  console.log(`\n👤 Admins:`);
  console.log(`   1. ${deployer.address} (deployer/EVM)`);
  console.log(`   2. ${SUBSTRATE_H160} (Substrate-derived)`);
  console.log(`\n🔗 View on Explorer:`);
  console.log(`   https://polkadot.testnet.routescan.io/address/${CONTRACT_ADDRESS}`);
  console.log(`\n📝 Update your .env with:`);
  console.log(`   VITE_DEFAULT_ORG_ID=${orgId}`);
  console.log(`\n⚠️  Next Steps:`);
  console.log(`   1. Your Substrate account (${SUBSTRATE_H160}) is now an admin`);
  console.log(`   2. To use it, you may need to call 'map_account' on Polkadot Hub`);
  console.log(`   3. Or use Talisman/SubWallet in EVM mode`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
