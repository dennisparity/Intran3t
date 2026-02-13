#!/usr/bin/env node
/**
 * Mark old Solidity contracts as deprecated
 * Documents migration to PolkaVM Rust contracts
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const deprecationRecord = {
  deprecatedAt: new Date().toISOString(),
  reason: 'Migrated to PolkaVM Rust contracts',
  migration: {
    from: 'Solidity contracts deployed via Hardhat with MetaMask',
    to: 'PolkaVM Rust contracts deployed via pallet_revive with Substrate accounts',
    benefits: [
      'No MetaMask dependency in deployment flow',
      'Uses native Substrate accounts and wallets',
      'Aligns with Polkadot ecosystem best practices',
      'Maintains ABI compatibility with frontend'
    ]
  },
  contracts: [
    {
      name: 'Intran3tAccessPass',
      type: 'ERC-721 soulbound access pass NFT',
      address: '0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94',
      deployedBy: '0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62',
      deployedAt: '2026-01-23',
      network: 'Polkadot Hub TestNet',
      chainId: 420420417,
      status: 'deprecated',
      replacedBy: {
        type: 'PolkaVM Rust contract',
        deploymentScript: 'contracts/polkavm/scripts/deploy-accesspass.ts',
        sourceCode: 'contracts/polkavm/src/accesspass.rs',
        addressEnvVar: 'VITE_ACCESSPASS_CONTRACT_ADDRESS_POLKAVM',
        note: 'To be deployed - address will be added after deployment'
      },
      changes: [
        'Removed RBAC dependency - anyone can mint to themselves',
        'Contract owner determined by derived EVM address from Substrate account',
        'Same function selectors and ABI (frontend compatible)',
        'Soulbound behavior unchanged'
      ]
    },
    {
      name: 'Intran3tRBAC',
      type: 'Role-based access control',
      address: '0xF1152B54404F7F4B646199072Fd3819D097c4F94',
      deployedBy: '0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62',
      deployedAt: '2026-01-20',
      network: 'Polkadot Hub TestNet',
      chainId: 420420417,
      status: 'removed',
      replacedBy: null,
      note: 'Removed completely from project - simplified architecture with permissionless minting'
    }
  ],
  frontend: {
    changes: [
      'Removed RBAC checks from Acc3ssWidget',
      'Added feature flag: VITE_USE_POLKAVM_CONTRACTS',
      'Updated contract address resolution logic',
      'Removed useRBACContract hook',
      'Removed RBAC contract types'
    ],
    filesRemoved: [
      'src/contracts/intran3t-rbac.ts',
      'src/hooks/useRBACContract.ts'
    ]
  },
  instructions: {
    forUsers: [
      'Update .env with new PolkaVM contract address after deployment',
      'Set VITE_USE_POLKAVM_CONTRACTS=true to use new contracts',
      'Old Solidity contracts remain on-chain but are no longer maintained'
    ],
    forDevelopers: [
      'Deploy PolkaVM contract: cd contracts/polkavm && MNEMONIC="..." npm run deploy:accesspass',
      'Update frontend .env with new contract address',
      'Test minting via Acc3ss module',
      'Verify contract ownership is derived EVM address'
    ]
  },
  links: {
    oldExplorer: 'https://polkadot.testnet.routescan.io/',
    oldAccessPass: 'https://polkadot.testnet.routescan.io/address/0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94',
    oldRBAC: 'https://polkadot.testnet.routescan.io/address/0xF1152B54404F7F4B646199072Fd3819D097c4F94',
    migration: {
      plan: 'Plan created during migration planning phase',
      documentation: 'See CLAUDE.md for complete migration details'
    }
  }
};

const outputPath = resolve(__dirname, '../deployments/deprecated.json');

writeFileSync(outputPath, JSON.stringify(deprecationRecord, null, 2));

console.log('✅ Deprecation record created');
console.log(`📄 File: ${outputPath}`);
console.log('');
console.log('📋 Summary:');
console.log(`  - AccessPass (Solidity): ${deprecationRecord.contracts[0].address} → deprecated`);
console.log(`  - RBAC (Solidity): ${deprecationRecord.contracts[1].address} → removed`);
console.log('');
console.log('🔄 Migration:');
console.log('  From: Solidity contracts (Hardhat + MetaMask)');
console.log('  To: PolkaVM Rust contracts (pallet_revive + Substrate accounts)');
console.log('');
console.log('📦 Next steps:');
console.log('  1. Deploy PolkaVM AccessPass contract');
console.log('  2. Update contract address in deprecation record');
console.log('  3. Update frontend .env with new address');
console.log('  4. Test end-to-end flow');
