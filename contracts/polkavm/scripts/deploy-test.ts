#!/usr/bin/env tsx
import { createWalletClient, createPublicClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';
const CHAIN_ID = 420420417;

const paseoChain = {
  id: CHAIN_ID,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
} as const;

async function deploy() {
  const mnemonic = process.env.MNEMONIC || process.env.DOTNS_MNEMONIC;
  if (!mnemonic) {
    console.error('❌ MNEMONIC not set in .env');
    process.exit(1);
  }

  const account = mnemonicToAccount(mnemonic);
  const publicClient = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });
  const walletClient = createWalletClient({ account, chain: paseoChain, transport: http(EVM_RPC) });

  const contractCode = readFileSync(resolve(__dirname, '../target/test_minimal.polkavm'));
  const bytecode = `0x${contractCode.toString('hex')}` as `0x${string}`;

  console.log('\n🧪 Deploying minimal test contract');
  console.log('Size:', contractCode.length, 'bytes');
  console.log('Deployer:', account.address);

  const hash = await walletClient.sendTransaction({
    to: null as any,
    data: bytecode,
  });

  console.log('Tx hash:', hash);
  console.log('Waiting...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    console.error('❌ Deployment failed');
    process.exit(1);
  }

  console.log('\n✅ Contract deployed:', receipt.contractAddress);
  console.log('Block:', receipt.blockNumber.toString());

  // Test increment
  console.log('\n--- Testing increment ---');
  const INCREMENT_SELECTOR = '0xd09de08a';
  const GET_COUNT_SELECTOR = '0xa87d942c';

  const incTx = await walletClient.sendTransaction({
    to: receipt.contractAddress,
    data: INCREMENT_SELECTOR,
  });
  await publicClient.waitForTransactionReceipt({ hash: incTx });
  console.log('✓ Incremented');

  const countResult = await publicClient.call({
    to: receipt.contractAddress,
    data: GET_COUNT_SELECTOR,
  });

  if (countResult.data) {
    // Contract returns little-endian u64, reverse bytes to read it
    const bytes = countResult.data.slice(2).match(/.{2}/g)!.reverse();
    const count = BigInt('0x' + bytes.join(''));
    console.log('✓ Counter value:', count.toString());

    if (count === 1n) {
      console.log('\n🎉 SUCCESS! Minimal test contract works!');
      console.log('✅ Basic storage operations are working!');
    } else {
      console.log('\n⚠️  Counter should be 1, got:', count.toString());
    }
  }
}

deploy().catch(console.error);
