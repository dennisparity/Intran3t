/**
 * Test address conversion for the user's Substrate address
 */

import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

// User's Substrate address (AphexTwin94)
const substrateAddress = '5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR';

// User's actual EVM address (provided)
const actualEvmAddress = '0x7e59585d3bc72532ee7d1ceae9be732e6edceb62';

console.log('🔍 Testing Substrate to EVM Address Conversion');
console.log('');
console.log('Input Substrate Address:', substrateAddress);
console.log('Expected EVM Address:', actualEvmAddress);
console.log('');

try {
  // Decode Substrate address to get 32-byte public key
  const publicKey = decodeAddress(substrateAddress);
  console.log('Public Key (32 bytes):', u8aToHex(publicKey));

  // Method 1: Truncated Mapping (first 20 bytes)
  const evmBytes = publicKey.slice(0, 20);
  const derivedEvmAddress = u8aToHex(evmBytes);

  console.log('');
  console.log('📊 Conversion Results:');
  console.log('Derived EVM Address (Truncated):', derivedEvmAddress);
  console.log('Actual EVM Address (Provided):', actualEvmAddress.toLowerCase());
  console.log('');

  if (derivedEvmAddress.toLowerCase() === actualEvmAddress.toLowerCase()) {
    console.log('✅ MATCH! The addresses match using Truncated Mapping method.');
  } else {
    console.log('❌ NO MATCH. The addresses do NOT match.');
    console.log('');
    console.log('💡 This means:');
    console.log('   - Your wallet uses a different derivation method, OR');
    console.log('   - The EVM address is from a different account/keypair');
    console.log('');
    console.log('🔧 Solution:');
    console.log('   Use the EVM address your wallet provides: ' + actualEvmAddress);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
