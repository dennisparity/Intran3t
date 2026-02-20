#!/usr/bin/env node
/**
 * Quick smoke test: Call formCount() on deployed contract
 */

import { createPublicClient, http } from 'viem';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read deployed contract address
const deploymentPath = resolve(__dirname, '../deployment_forms.json');
let contractAddress;
try {
  const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
  contractAddress = deployment.contractAddress;
  console.log('Contract address:', contractAddress);
} catch (err) {
  console.error('❌ deployment_forms.json not found. Run: npm run deploy:forms');
  process.exit(1);
}

const EVM_RPC = 'https://eth-rpc-testnet.polkadot.io';

const paseoChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
};

// formCount() — selector: 0x146c1415, no params, returns uint256
const FORM_COUNT_SELECTOR = '0x146c1415';

const client = createPublicClient({ chain: paseoChain, transport: http(EVM_RPC) });

console.log('\n🧪 Testing formCount()...\n');

const result = await client.call({
  to: contractAddress,
  data: FORM_COUNT_SELECTOR,
});

const hexResult = result.data || '0x';
const count = BigInt(hexResult);

console.log('✅ formCount() returned:', count.toString());
console.log('   Raw hex:', hexResult);

if (count === 0n) {
  console.log('\n✨ Contract is working! formCount = 0 (no forms registered yet)\n');
} else {
  console.log(`\n⚠️  Unexpected count: ${count} (expected 0 on fresh deployment)\n`);
}
