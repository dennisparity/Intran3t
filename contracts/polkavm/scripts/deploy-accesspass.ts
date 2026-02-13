#!/usr/bin/env node
/**
 * Deploy AccessPass PolkaVM contract to Polkadot Hub TestNet
 * Uses Substrate account (from mnemonic) to deploy via pallet_revive
 * Contract owner will be derived EVM address from Substrate account
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { decodeAddress } from '@polkadot/util-crypto';
import { keccak256 } from 'viem';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Network configuration
const RPC_ENDPOINT = 'wss://polkadot-testnet-rpc.polkadot.io';
const CHAIN_ID = 420420417;

// Contract configuration
const WASM_PATH = resolve(__dirname, '../target/riscv64emac-unknown-none-polkavm/release/accesspass.polkavm');
const OUTPUT_PATH = resolve(__dirname, '../deployment_polkavm.json');
const OLD_CONTRACT = '0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94';

/**
 * Derive EVM address from Substrate account (deterministic)
 * Method: keccak256(AccountId32) → last 20 bytes
 */
function deriveEvmAddress(ss58Address: string): string {
  const decoded = decodeAddress(ss58Address);
  const hash = keccak256(decoded);
  return '0x' + hash.slice(-40); // last 20 bytes
}

/**
 * Deploy AccessPass contract
 */
async function deploy() {
  console.log('\n🚀 Deploying AccessPass PolkaVM Contract');
  console.log('============================================================\n');

  // Check MNEMONIC
  const mnemonic = process.env.MNEMONIC || process.env.DOTNS_MNEMONIC;
  if (!mnemonic) {
    console.error('❌ Error: MNEMONIC not found in environment variables');
    console.error('   Set MNEMONIC or DOTNS_MNEMONIC in your .env file\n');
    process.exit(1);
  }

  // Check WASM file exists
  if (!existsSync(WASM_PATH)) {
    console.error('❌ Error: WASM file not found:', WASM_PATH);
    console.error('   Run: cargo build --release --bin accesspass\n');
    process.exit(1);
  }

  // Create Substrate keypair from mnemonic
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(mnemonic);

  console.log('Deployer (Substrate):', deployer.address);

  // Derive EVM address (deterministic)
  const derivedEvm = deriveEvmAddress(deployer.address);
  console.log('Deployer (EVM - derived):', derivedEvm);
  console.log('This EVM address will be the contract owner\n');

  // Connect to Polkadot Hub TestNet
  console.log('Connecting to:', RPC_ENDPOINT);
  const provider = new WsProvider(RPC_ENDPOINT);
  const api = await ApiPromise.create({ provider });

  console.log('Chain:', await api.rpc.system.chain());
  console.log('Node version:', await api.rpc.system.version());
  console.log('');

  // Load WASM bytecode
  const wasmCode = readFileSync(WASM_PATH);
  console.log('Contract bytecode loaded:', wasmCode.length, 'bytes');
  console.log('');

  // Deploy via pallet_revive.instantiateWithCode
  console.log('Creating deployment transaction...');

  const tx = api.tx.revive.instantiateWithCode(
    {
      value: 0,
      gasLimit: api.registry.createType('WeightV2', {
        refTime: '10000000000',  // 10B ref time
        proofSize: '1000000'      // 1MB proof size
      }),
      storageDepositLimit: null,
    },
    wasmCode,
    [],  // constructor args (empty - owner set from caller in deploy())
    null // salt (null = default)
  );

  console.log('Signing with Substrate account:', deployer.address);
  console.log('Submitting transaction...\n');

  return new Promise<void>((resolve, reject) => {
    let contractAddress: string | null = null;
    let blockHash: string | null = null;

    tx.signAndSend(deployer, ({ status, events, dispatchError }) => {
      console.log('Transaction status:', status.type);

      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          console.error(`\n❌ ${section}.${name}: ${docs.join(' ')}`);
        } else {
          console.error('\n❌', dispatchError.toString());
        }
        reject(new Error('Deployment failed'));
        return;
      }

      // Extract contract address from events
      events.forEach(({ event }) => {
        if (api.events.revive.Instantiated.is(event)) {
          const [deployer, contract] = event.data;
          contractAddress = contract.toString();
          console.log('\n✨ Contract instantiated!');
          console.log('Contract address:', contractAddress);
        }
      });

      if (status.isInBlock) {
        blockHash = status.asInBlock.toString();
        console.log('In block:', blockHash);
      }

      if (status.isFinalized) {
        console.log('Finalized in block:', status.asFinalized.toString());
        console.log('');

        if (contractAddress) {
          // Save deployment record
          const deploymentRecord = {
            contract: 'AccessPass',
            network: 'Polkadot Hub TestNet',
            chainId: CHAIN_ID,
            rpcEndpoint: RPC_ENDPOINT,
            contractAddress,
            deployerSubstrate: deployer.address,
            deployerEvm: derivedEvm,
            blockHash,
            oldSolidityAddress: OLD_CONTRACT,
            timestamp: new Date().toISOString(),
            migration: {
              from: 'Solidity ERC-721 (Hardhat deployment)',
              to: 'PolkaVM Rust (pallet_revive deployment)',
              changes: [
                'Removed RBAC dependency (anyone can mint to themselves)',
                'Deployment uses Substrate accounts (no MetaMask)',
                'Contract owner is derived EVM address',
                'Same function selectors (ABI compatible)'
              ]
            }
          };

          writeFileSync(OUTPUT_PATH, JSON.stringify(deploymentRecord, null, 2));
          console.log('📄 Deployment record saved:', OUTPUT_PATH);
          console.log('');

          console.log('✅ Deployment complete!');
          console.log('');
          console.log('📋 Next steps:');
          console.log(`1. Update .env: VITE_ACCESSPASS_CONTRACT_ADDRESS_POLKAVM=${contractAddress}`);
          console.log('2. Set feature flag: VITE_USE_POLKAVM_CONTRACTS=true');
          console.log('3. Test minting via frontend (Acc3ss module)');
          console.log('4. Verify contract owner is derived address');
          console.log('');

          api.disconnect();
          resolve();
        } else {
          console.error('❌ Contract address not found in events');
          api.disconnect();
          reject(new Error('Contract address not found'));
        }
      }
    }).catch((error) => {
      console.error('\n❌ Transaction error:', error);
      api.disconnect();
      reject(error);
    });
  });
}

// Run deployment
deploy()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  });
