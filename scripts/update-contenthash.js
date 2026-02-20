import { config } from "dotenv";
import { DotNS } from "./dotns.js";
import { encodeContenthash } from "./deploy.js";

config();

const DOMAIN_NAME = process.env.DOTNS_DOMAIN || "intran3t-app42";
const IPFS_CID = process.env.IPFS_CID || "bafybeia2dszyud6krihvagnjh5ypxsycyucoxsf53ckyrk5nvvef62bjaq";

console.log("\n🔄 Updating DotNS Contenthash");
console.log("=".repeat(60));
console.log(`Domain: ${DOMAIN_NAME}.dot`);
console.log(`New CID: ${IPFS_CID}\n`);

const dotns = new DotNS();
await dotns.connect();

try {
  console.log(`Setting contenthash...`);
  const contenthashHex = `0x${encodeContenthash(IPFS_CID)}`;
  console.log(`Contenthash: ${contenthashHex}\n`);

  await dotns.setContenthash(DOMAIN_NAME, contenthashHex);

  console.log("\n✅ Contenthash updated successfully!");
  console.log("=".repeat(60));
  console.log(`\n🌐 Your site should now be live at:`);
  console.log(`   https://${DOMAIN_NAME}.paseo.li`);
  console.log(`\nVerify IPFS content:`);
  console.log(`   https://dweb.link/ipfs/${IPFS_CID}\n`);
} catch (error) {
  console.error("\n❌ Update failed:", error.message);
  throw error;
} finally {
  dotns.disconnect();
}
