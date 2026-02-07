#!/usr/bin/env node

/**
 * Deploy Next.js static export to Polkadot via DotNS + Bulletin
 */

import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Configuration
const BUILD_DIR = path.join(projectRoot, "dist");
const DOMAIN_NAME = process.env.DOTNS_DOMAIN || `intran3t-test${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;

console.log("\n🚀 DotNS Deployment - Intran3t");
console.log("=".repeat(60));
console.log(`\n📦 Domain: ${DOMAIN_NAME}.dot`);
console.log(`📁 Build: ${BUILD_DIR}\n`);

// Check build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  console.error("❌ Build directory not found. Run 'npm run build' first.");
  process.exit(1);
}

// Check IPFS CLI
try {
  execSync("ipfs version", { stdio: "ignore" });
} catch {
  console.error("❌ IPFS CLI not installed");
  console.error("   Install from: https://docs.ipfs.tech/install/");
  process.exit(1);
}

// Import deploy function
const { deploy } = await import("./deploy.js");

// Deploy
try {
  const result = await deploy(BUILD_DIR, DOMAIN_NAME);
  
  console.log("\n✅ DEPLOYMENT SUCCESS!");
  console.log("=".repeat(60));
  console.log(`\n🌐 Your site is live at:`);
  console.log(`   ${result.url}`);
  console.log(`   ${result.altUrl}`);
  console.log("\n" + "=".repeat(60) + "\n");
} catch (error) {
  console.error("\n❌ Deployment failed:", error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
}
