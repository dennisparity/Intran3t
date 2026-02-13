#!/usr/bin/env node
/**
 * Transfer DotNS domain ownership
 * Uses Substrate key derivation (compatible with dotns.js)
 */

import { createWalletClient, http, namehash, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { config } from 'dotenv';

config();

const paseoAssetHub = {
  id: 420420417,
  name: 'Paseo Asset Hub',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 10 },
  rpcUrls: {
    default: { http: ['https://services.polkadothub-rpc.com/testnet'] }
  }
};

const DOTNS_REGISTRAR = '0x329aAA5b6bEa94E750b2dacBa74Bf41291E6c2BD';

const ERC721_ABI = [
  {
    name: 'safeTransferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: []
  }
];

const DOMAIN = 'intran3t-app42';
const TO_ADDRESS = process.argv[2];

if (!TO_ADDRESS) {
  console.error('Usage: node transfer-domain-substrate.js <to-evm-address>');
  console.error('Example: node transfer-domain-substrate.js 0xed041713db3374bac7b4963c574739fdc5da3604');
  process.exit(1);
}

console.log('\n🔄 Transferring Domain Ownership');
console.log('='.repeat(60));

// Initialize crypto
await cryptoWaitReady();

// Create Substrate keyring and derive EVM private key
const mnemonic = process.env.DOTNS_MNEMONIC || process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error('DOTNS_MNEMONIC not found in .env');
}

const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
const substrateAccount = keyring.addFromUri(mnemonic, {}, 'sr25519');

// Derive EVM private key from Substrate keypair (this matches dotns.js logic)
const evmPrivateKey = u8aToHex(substrateAccount.derive('//evm').secretKey);
const account = privateKeyToAccount(evmPrivateKey);

console.log(`From: ${account.address}`);
console.log(`To: ${TO_ADDRESS}`);
console.log(`Domain: ${DOMAIN}.dot`);

const node = namehash(`${DOMAIN}.dot`);
console.log(`Token ID: ${node}\n`);

// Create clients
const publicClient = createPublicClient({
  chain: paseoAssetHub,
  transport: http()
});

const walletClient = createWalletClient({
  account,
  chain: paseoAssetHub,
  transport: http()
});

// Call safeTransferFrom
console.log('Submitting transfer transaction...');

try {
  const hash = await walletClient.writeContract({
    address: DOTNS_REGISTRAR,
    abi: ERC721_ABI,
    functionName: 'safeTransferFrom',
    args: [account.address, TO_ADDRESS, BigInt(node)]
  });

  console.log(`Transaction: ${hash}`);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'success') {
    console.log(`\n✅ Success!`);
    console.log(`Block: ${receipt.blockNumber}`);
    console.log(`\n✨ Domain ownership transferred successfully!`);
    console.log(`${DOMAIN}.dot now owned by: ${TO_ADDRESS}`);
  } else {
    console.log(`\n❌ Transaction failed`);
    console.log(`Receipt:`, receipt);
  }
} catch (error) {
  console.error(`\n❌ Transfer failed:`, error.message);
  throw error;
}
