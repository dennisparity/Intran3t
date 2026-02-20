#!/usr/bin/env node
/**
 * Deploy debug storage test contract to Polkadot Hub TestNet
 * Minimal contract to test if basic storage operations work in PolkaVM
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';
const CHAIN_ID = 420420417;
const POLKAVM_PATH = resolve(__dirname, '../target/forms_debug.polkavm');
const OUTPUT_PATH = resolve(__dirname, '../deployment_debug.json');

const paseoChain = {
  id: CHAIN_ID,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
} as const;

async function deploy() {
  console.log('\n🧪 Deploying Debug Storage Test Contract');
  console.log('============================================================\n');

  const mnemonic = process.env.MNEMONIC || process.env.DOTNS_MNEMONIC;
  if (!mnemonic) {
    console.error('❌ MNEMONIC not set in .env\n');
    process.exit(1);
  }

  if (!existsSync(POLKAVM_PATH)) {
    console.error('❌ forms_debug.polkavm not found. Run: cargo build --release --bin forms_debug && polkatool link --strip --output target/forms_debug.polkavm target/riscv64emac-unknown-none-polkavm/release/forms_debug\n');
    process.exit(1);
  }

  const account = mnemonicToAccount(mnemonic);
  console.log('Deployer (EVM):', account.address);
  console.log('RPC:', EVM_RPC, '\n');

  const publicClient = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${(Number(balance) / 1e18).toFixed(4)} PAS`);

  if (balance === 0n) {
    console.error('\n❌ EVM account has no PAS tokens. Fund it at: https://faucet.polkadot.io/\n');
    process.exit(1);
  }

  const walletClient = createWalletClient({ account, chain: paseoChain, transport: http(EVM_RPC) });

  const contractCode = readFileSync(POLKAVM_PATH);
  const bytecode = `0x${contractCode.toString('hex')}` as `0x${string}`;
  console.log(`Contract bytecode: ${contractCode.length} bytes\n`);

  console.log('Submitting contract creation...');
  const hash = await walletClient.sendTransaction({
    to: null as any,
    data: bytecode,
  });
  console.log('Transaction hash:', hash);

  console.log('Waiting for receipt...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    console.error('❌ No contract address in receipt. Status:', receipt.status);
    process.exit(1);
  }

  const contractAddress = receipt.contractAddress;
  console.log('\n✨ Contract deployed!');
  console.log('Contract address:', contractAddress);
  console.log('Block:', receipt.blockNumber.toString());

  const record = {
    contract: 'FormsDebug',
    purpose: 'Basic storage operations test',
    network: 'Polkadot Hub TestNet',
    chainId: CHAIN_ID,
    rpcEndpoint: EVM_RPC,
    contractAddress,
    deployerEvm: account.address,
    blockNumber: receipt.blockNumber.toString(),
    txHash: hash,
    timestamp: new Date().toISOString(),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(record, null, 2));
  console.log('\n📄 Saved:', OUTPUT_PATH);
  console.log('\n✅ Done!\n');
  console.log('Test with: node scripts/test-debug-storage.mjs\n');
}

deploy().then(() => process.exit(0)).catch((err) => {
  console.error('\n💥 Failed:', err.message);
  process.exit(1);
});
