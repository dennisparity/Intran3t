#!/usr/bin/env node
import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf8');
const privateKeyMatch = envContent.match(/PRIVATE_KEY="?([^"\n]+)"?/);

if (!privateKeyMatch) {
  console.error('PRIVATE_KEY not found in .env');
  process.exit(1);
}

const privateKey = privateKeyMatch[1].trim();
const RPC_URL = 'https://eth-rpc-testnet.polkadot.io';
const CHAIN_ID = 420420417;

console.log('\nDeploying ParityDAO Contract');
console.log('Network:  Paseo Asset Hub (v2)');
console.log('Chain ID:', CHAIN_ID);
console.log('RPC:     ', RPC_URL);
console.log('-'.repeat(60));

const artifactPath = resolve(__dirname, '../artifacts/contracts/ParityDAO.sol/ParityDAO.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

async function deploy() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('\nDeployer:', wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance: ', ethers.formatEther(balance), 'PAS');

    if (balance === 0n) {
      console.error('\nInsufficient balance. Get testnet tokens:');
      console.error(`  https://faucet.polkadot.io/paseo?address=${wallet.address}`);
      process.exit(1);
    }

    console.log('\nDeploying...');
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy();
    console.log('Tx hash:', contract.deploymentTransaction().hash);
    console.log('Waiting for confirmation...');

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log('\n' + '-'.repeat(60));
    console.log('Contract Address:', address);
    console.log('-'.repeat(60));

    const deploymentInfo = {
      contractAddress: address,
      deployer: wallet.address,
      network: 'Paseo Asset Hub',
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      deployedAt: new Date().toISOString(),
      txHash: contract.deploymentTransaction().hash,
    };

    writeFileSync(
      resolve(__dirname, '../deployment_parity_dao.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\nNext: update src/lib/contracts/config.ts');
    console.log(`  daoContract: "${address}"`);

  } catch (error) {
    console.error('\nDeployment failed:', error.message);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      const wallet = new ethers.Wallet(privateKey);
      console.error(`Faucet: https://faucet.polkadot.io/paseo?address=${wallet.address}`);
    }
    process.exit(1);
  }
}

deploy();
