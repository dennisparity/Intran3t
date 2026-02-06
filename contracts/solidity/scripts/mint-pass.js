const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Load deployment info
  const deploymentFile = `./deployments/accesspass-${hre.network.name}.json`;

  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.log("Please deploy the contract first:");
    console.log(`npx hardhat run scripts/deploy-accesspass.js --network ${hre.network.name}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deployment.contractAddress;

  console.log(`Minting access pass on ${hre.network.name}...`);
  console.log(`Contract: ${contractAddress}`);

  // Get contract instance
  const Intran3tAccessPass = await hre.ethers.getContractFactory("Intran3tAccessPass");
  const accessPass = Intran3tAccessPass.attach(contractAddress);

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log(`Minter: ${signer.address}`);

  // Mint parameters (customize these)
  const to = signer.address; // Mint to self for testing
  const location = "Berlin Office";
  const locationId = "berlin";
  const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
  const accessLevel = "standard";
  const identityDisplay = "Test User"; // Replace with actual identity

  console.log("\nMinting with parameters:");
  console.log(`  To: ${to}`);
  console.log(`  Location: ${location}`);
  console.log(`  Location ID: ${locationId}`);
  console.log(`  Expires At: ${new Date(expiresAt * 1000).toLocaleString()}`);
  console.log(`  Access Level: ${accessLevel}`);
  console.log(`  Identity: ${identityDisplay}`);

  // Mint the pass
  const tx = await accessPass.mintAccessPass(
    to,
    location,
    locationId,
    expiresAt,
    accessLevel,
    identityDisplay
  );

  console.log(`\n⏳ Transaction submitted: ${tx.hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

  // Get token ID from event
  const event = receipt.logs.find(
    (log) => {
      try {
        const parsed = accessPass.interface.parseLog(log);
        return parsed && parsed.name === "AccessPassMinted";
      } catch (e) {
        return false;
      }
    }
  );

  if (event) {
    const parsed = accessPass.interface.parseLog(event);
    const tokenId = parsed.args.tokenId;
    console.log(`\n🎫 Access Pass Minted!`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Holder: ${parsed.args.holder}`);
    console.log(`   Location: ${parsed.args.location}`);

    // Get metadata
    const metadata = await accessPass.getPassMetadata(tokenId);
    console.log(`\n📋 Pass Metadata:`);
    console.log(`   Location: ${metadata.location}`);
    console.log(`   Location ID: ${metadata.locationId}`);
    console.log(`   Holder: ${metadata.holder}`);
    console.log(`   Issued At: ${new Date(Number(metadata.issuedAt) * 1000).toLocaleString()}`);
    console.log(`   Expires At: ${new Date(Number(metadata.expiresAt) * 1000).toLocaleString()}`);
    console.log(`   Access Level: ${metadata.accessLevel}`);
    console.log(`   Revoked: ${metadata.revoked}`);

    // Check if valid
    const isValid = await accessPass.isPassValid(tokenId);
    console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
