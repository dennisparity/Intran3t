/**
 * Script to grant MINTER_ROLE to an address on the AccessPass contract
 *
 * Usage:
 * npx hardhat run scripts/grant-minter-role.js --network polkadotHubTestnet
 */

const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x5b10D55d22F85d4Ef9623227087c264057a52422";

  // Address to grant MINTER_ROLE to
  const TARGET_ADDRESS = process.env.TARGET_ADDRESS || process.argv[2];

  if (!TARGET_ADDRESS) {
    console.error("❌ Please provide target address:");
    console.error("   npx hardhat run scripts/grant-minter-role.js --network polkadotHubTestnet 0xYOUR_ADDRESS");
    console.error("   OR set TARGET_ADDRESS environment variable");
    process.exit(1);
  }

  console.log("🔑 Granting MINTER_ROLE to AccessPass contract");
  console.log("   Contract:", CONTRACT_ADDRESS);
  console.log("   Target:", TARGET_ADDRESS);
  console.log("");

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("   Signer:", signer.address);
  console.log("");

  // Get contract instance
  const AccessPass = await hre.ethers.getContractAt("Intran3tAccessPass", CONTRACT_ADDRESS);

  // Calculate MINTER_ROLE hash
  const MINTER_ROLE = await AccessPass.MINTER_ROLE();
  console.log("   MINTER_ROLE hash:", MINTER_ROLE);
  console.log("");

  // Check if signer has ADMIN_ROLE (required to grant roles)
  const ADMIN_ROLE = await AccessPass.ADMIN_ROLE();
  const hasAdminRole = await AccessPass.hasRole(ADMIN_ROLE, signer.address);

  if (!hasAdminRole) {
    console.error("❌ Signer does not have ADMIN_ROLE. Cannot grant roles.");
    console.error("   Required role:", ADMIN_ROLE);
    process.exit(1);
  }

  console.log("✅ Signer has ADMIN_ROLE");
  console.log("");

  // Check if target already has MINTER_ROLE
  const hasMinterRole = await AccessPass.hasRole(MINTER_ROLE, TARGET_ADDRESS);

  if (hasMinterRole) {
    console.log("⚠️  Target address already has MINTER_ROLE");
    console.log("   Nothing to do.");
    return;
  }

  // Grant MINTER_ROLE
  console.log("📝 Granting MINTER_ROLE...");
  const tx = await AccessPass.grantRole(MINTER_ROLE, TARGET_ADDRESS);
  console.log("   Transaction hash:", tx.hash);
  console.log("   ⏳ Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("   ✅ Transaction confirmed in block:", receipt.blockNumber);
  console.log("");

  // Verify role was granted
  const nowHasRole = await AccessPass.hasRole(MINTER_ROLE, TARGET_ADDRESS);

  if (nowHasRole) {
    console.log("✅ MINTER_ROLE successfully granted!");
    console.log("   Address", TARGET_ADDRESS, "can now mint access passes");
  } else {
    console.error("❌ Role grant may have failed. Please verify manually.");
  }

  console.log("");
  console.log("🔗 View transaction:");
  console.log("   https://polkadot.testnet.routescan.io/tx/" + tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
