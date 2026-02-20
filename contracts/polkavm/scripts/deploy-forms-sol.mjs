#!/usr/bin/env node
/**
 * Deploy FormsV2 contract to Paseo Asset Hub
 */

import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment
const envPath = resolve(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf8');
const privateKeyMatch = envContent.match(/PRIVATE_KEY="?([^"\n]+)"?/);

if (!privateKeyMatch) {
  console.error('❌ PRIVATE_KEY not found in .env');
  console.error('\nPlease run: node scripts/derive-evm-key.mjs');
  process.exit(1);
}

const privateKey = privateKeyMatch[1];

// Network config
const RPC_URL = 'https://eth-rpc-testnet.polkadot.io';
const CHAIN_ID = 420420417;

console.log('\n🚀 Deploying FormsV2 Contract\n');
console.log('Network:     Paseo Asset Hub');
console.log('Chain ID:    ', CHAIN_ID);
console.log('RPC:         ', RPC_URL);
console.log('━'.repeat(60));

// Load contract artifacts
const artifactPath = resolve(__dirname, '../artifacts/contracts/FormsV2.sol/FormsV2.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

async function deploy() {
  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('\n👛 Deployer:    ', wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('   Balance:    ', ethers.formatEther(balance), 'PAS');

    if (balance === 0n) {
      console.error('\n❌ Insufficient balance! Get testnet tokens from:');
      console.error(`   https://faucet.polkadot.io/paseo?address=${wallet.address}`);
      process.exit(1);
    }

    console.log('\n📝 Deploying contract...');

    // Create contract factory
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    // Deploy
    const contract = await factory.deploy();
    console.log('   Tx hash:    ', contract.deploymentTransaction().hash);
    console.log('   Waiting for confirmation...');

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log('\n✅ Contract deployed successfully!\n');
    console.log('━'.repeat(60));
    console.log('Contract Address:', address);
    console.log('━'.repeat(60));

    // Save deployment info
    const deploymentInfo = {
      contractAddress: address,
      deployer: wallet.address,
      network: 'Paseo Asset Hub',
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      deployedAt: new Date().toISOString(),
      txHash: contract.deploymentTransaction().hash,
    };

    const deploymentPath = resolve(__dirname, '../deployment_forms_sol.json');
    writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to:', deploymentPath);

    console.log('\n📝 Next Steps:\n');
    console.log('1. Update contract address in config:');
    console.log(`   Edit: src/lib/contracts/config.ts`);
    console.log(`   Set:  formsContract: "${address}"`);
    console.log('\n2. Verify on block explorer:');
    console.log(`   https://polkadot.testnet.routescan.io/address/${address}`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('\n💡 Get testnet tokens from the faucet:');
      const wallet = new ethers.Wallet(privateKey);
      console.error(`   https://faucet.polkadot.io/paseo?address=${wallet.address}`);
    }
    process.exit(1);
  }
}

deploy();
