import { config } from "dotenv";
import { DotNS } from "./dotns.js";

config();

const DOMAIN_NAME = "intran3t-app42";
const CORRECT_RESOLVER = "0x95645C7fD0fF38790647FE13F87Eb11c1DCc8514"; // DotnsResolver

console.log("\n🔧 Fixing DotNS Resolver");
console.log("=".repeat(60));
console.log(`Domain: ${DOMAIN_NAME}.dot`);
console.log(`Target Resolver: ${CORRECT_RESOLVER}\n`);

const dotns = new DotNS();
await dotns.connect();

try {
  console.log(`Current owner: ${dotns.evmAddress}`);
  
  // Set the correct resolver
  console.log(`\nSetting resolver to DotnsResolver...`);
  await dotns.setResolver(DOMAIN_NAME, CORRECT_RESOLVER);
  
  console.log("\n✅ Resolver updated successfully!");
  console.log("=".repeat(60));
  console.log(`\nNow you can update the contenthash.\n`);
} catch (error) {
  console.error("\n❌ Update failed:", error.message);
  throw error;
} finally {
  dotns.disconnect();
}
