# Polkadot-Native EVM Integration

This document explains how Intran3t integrates EVM smart contracts while maintaining a pure Polkadot user experience.

## Design Philosophy

**No MetaMask. No separate wallets. Just Polkadot.**

Users connect their Polkadot wallet (Talisman, SubWallet, etc.) and the app automatically:
1. Derives their EVM address from their Substrate address
2. Uses that derived address for smart contract interaction
3. Signs transactions using their Polkadot wallet's EVM capabilities

## Address Derivation

### Truncated Mapping Method

According to [Polkadot documentation](https://docs.polkadot.com/polkadot-protocol/smart-contract-basics/accounts/), the EVM address (H160) is derived by taking the **first 20 bytes** of the Substrate public key:

```typescript
import { decodeAddress } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'

function substrateToEvm(substrateAddress: string): string {
  const publicKey = decodeAddress(substrateAddress) // 32 bytes
  const evmBytes = publicKey.slice(0, 20) // First 20 bytes
  return u8aToHex(evmBytes) // 0x-prefixed hex string
}
```

### Example

```
Substrate Address: 5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR
Public Key (32 bytes): 0xe24f96a936d01f1c1485bcf18965741aefdc27d78c8f817971831fdcc426de7f
Derived EVM Address: 0xe24f96a936d01f1c1485bcf18965741aefdc27d7
```

## User Flow

### 1. Connect Wallet
User connects Polkadot wallet via Typink (Talisman, SubWallet, etc.)

### 2. Identity Verification
App verifies identity from People Chain using Substrate address

### 3. Automatic EVM Derivation
```typescript
const { connectedAccount } = useTypink()
const derivedEvmAddress = substrateToEvm(connectedAccount.address)
```

### 4. Smart Contract Interaction
Use derived EVM address for all contract calls:
```typescript
await accessPassContract.mintAccessPass(
  derivedEvmAddress, // Holder
  'Berlin Office',
  'berlin-001',
  expiresAt,
  'standard',
  'AphexTwin94'
)
```

### 5. Transaction Signing
Polkadot wallet signs EVM transaction using its built-in EVM support

## Implementation

### Address Conversion Utility

See `src/lib/address-conversion.ts`:
- `substrateToEvm()` - Convert Substrate → EVM
- `evmToSubstrate()` - Convert EVM → Substrate (with padding)
- `isEvmAddress()` - Check if address is EVM format
- `isSubstrateAddress()` - Check if address is Substrate format

### Acc3ss Widget Integration

```typescript
// Derive EVM address from Substrate
useEffect(() => {
  if (connectedAccount?.address) {
    const evmAddr = substrateToEvm(connectedAccount.address)
    setDerivedEvmAddress(evmAddr)
  }
}, [connectedAccount?.address])

// Use derived address for contracts
const handleMint = async () => {
  await contract.mintAccessPass(
    derivedEvmAddress, // NOT a separate wallet!
    location,
    // ...
  )
}
```

## Setup

### 1. Grant MINTER_ROLE to Derived Address

```bash
# Derive EVM address from Substrate
node test-address-conversion.js

# Grant MINTER_ROLE to derived address
cd contracts/solidity
TARGET_ADDRESS=0xDERIVED_EVM_ADDRESS npx hardhat run scripts/grant-minter-role.js --network polkadotHubTestnet
```

### 2. Configure App

No configuration needed! The app automatically:
- Detects Substrate connection via Typink
- Derives EVM address in background
- Uses derived address for contracts

## Benefits

✅ **Single Wallet** - Users only need their Polkadot wallet
✅ **Single Seed Phrase** - One seed manages both addresses
✅ **Seamless UX** - No manual address management
✅ **No MetaMask** - Pure Polkadot experience
✅ **Identity-Linked** - EVM address cryptographically bound to verified identity

## Technical Details

### Why Truncated Mapping?

The truncated mapping is deterministic and reversible:
- **Substrate → EVM**: First 20 bytes of public key
- **EVM → Substrate**: Pad with 12 bytes of `0xEE`

This is the official Polkadot Asset Hub approach per `pallet_revive` specification.

### Wallet Compatibility

Polkadot wallets with EVM support:
- **Talisman** ✅ (Recommended)
- **SubWallet** ✅ (Recommended)
- **Nova Wallet** ✅
- **Polkadot.js Extension** ⚠️ (Limited EVM support)

These wallets can sign both:
- Substrate transactions (SR25519/Ed25519)
- EVM transactions (secp256k1) via injected provider

### Current Implementation Status

**✅ Completed:**
- Address derivation utility
- Automatic conversion in Acc3ss widget
- MINTER_ROLE granted to derived address
- Removed all MetaMask references

**⏳ Remaining:**
- Test transaction signing with Polkadot wallet
- Verify EVM provider detects Polkadot wallet
- Handle edge cases (no EVM support, etc.)

## Troubleshooting

### "No EVM provider found"

Make sure your Polkadot wallet has EVM support enabled:
- **Talisman**: Settings → Networks & Tokens → Ethereum → Enable
- **SubWallet**: Enable Ethereum network in settings

### "Transaction signing failed"

Polkadot wallet may prompt twice:
1. First: Approve EVM connection
2. Second: Sign transaction

Approve both prompts.

### "User does not have MINTER_ROLE"

Grant MINTER_ROLE to the **derived** EVM address, not the wallet's separate EVM account:

```bash
# Check your derived address
node test-address-conversion.js

# Grant role
TARGET_ADDRESS=0xDERIVED_ADDRESS npx hardhat run scripts/grant-minter-role.js --network polkadotHubTestnet
```

## References

- [Polkadot Asset Hub Accounts](https://docs.polkadot.com/polkadot-protocol/smart-contract-basics/accounts/)
- [Substrate/EVM Address Conversion](https://doc.cess.network/developer/advanced-guides/substrate-evm)
- [pallet_revive Specification](https://github.com/paritytech/polkadot-sdk)

---

**Key Insight:** This architecture enables a pure Polkadot UX while leveraging EVM smart contracts. Users never see or manage EVM addresses directly - everything happens automatically based on their Polkadot identity.
