# Simple Flow - Verified Identity → Full Access

## How It Works Now

### 1. User Connects Polkadot Wallet
```
User → Connects Talisman/SubWallet → Typink detects connection
```

### 2. Identity Check
```typescript
// App checks People Chain
const identity = await queryOnChainIdentity(substrateAddress)

if (identity.verified && identity.matrix?.includes('@parity.io')) {
  // ✅ Unlock all modules
} else {
  // 🔒 Lock UI, show setup flow
}
```

### 3. Unlock All Functionality
Once verified, user sees:
- ✅ Governance module
- ✅ Forms module
- ✅ **Acc3ss module** (mint access passes)
- ✅ All other modules

### 4. Mint Access Pass (Self-Minting)
```typescript
// User clicks "Mint NFT Access Pass"
// App derives EVM address from Substrate address
const evmAddress = substrateToEvm(substrateAddress)

// Contract allows self-minting - NO ROLES NEEDED!
await contract.mintAccessPass(
  evmAddress,      // Mint to derived EVM address
  'Berlin Office',
  'berlin-001',
  expiresAt,
  'standard',
  'AphexTwin94'    // Identity display name
)
```

### 5. Sign Transaction
```
Polkadot Wallet → EVM Transaction Prompt → User Approves → Pass Minted ✅
```

## Smart Contract Logic

**Updated AccessPass Contract:**
```solidity
function mintAccessPass(...) external returns (uint256) {
    // Allow self-minting OR admin minting
    require(
        to == msg.sender || hasRole(MINTER_ROLE, msg.sender),
        "Can only mint for yourself unless you have minter role"
    );

    // Mint the pass
    // ...
}
```

**Key Change:** Removed `onlyRole(MINTER_ROLE)` requirement for self-minting.

## Address Linking

The app automatically links your addresses:

```
Substrate Address (Identity):
5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR
         ↓ (derives to)
EVM Address (Smart Contracts):
0xe24f96a936d01f1c1485bcf18965741aefdc27d7
         ↓ (but wallet actually signs with)
Wallet EVM Address:
0x7e59585d3bc72532ee7d1ceae9be732e6edceb62
```

**How it works:**
1. App derives EVM address using Polkadot truncation method
2. But wallet uses its own EVM keypair for signing
3. App auto-links both addresses in localStorage
4. Transaction signed by wallet's actual EVM address

## New Contract Deployment

**Old Contract (Required MINTER_ROLE):**
`0x5b10D55d22F85d4Ef9623227087c264057a52422`

**New Contract (Self-Minting Enabled):**
`0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94`

## Testing

### As a New User with Verified Identity:

1. **Connect wallet** with verified Polkadot identity
2. **Go to Acc3ss** → UI should be unlocked
3. **Select location** (e.g., Berlin Office)
4. **Click "Mint NFT Access Pass"**
5. **Approve transaction** in wallet
6. **Pass minted** ✅ No manual role granting needed!

### As Admin:

You can still mint passes for other users:
```typescript
// Admin has MINTER_ROLE
await contract.mintAccessPass(
  otherUserAddress,  // Mint to someone else
  'Berlin Office',
  // ...
)
```

## Security

✅ **Identity Verification:** UI level (checks People Chain)
✅ **Self-Minting Only:** Users can only mint for their own address
✅ **Admin Override:** Admins can mint for anyone
✅ **Access Control:** Roles still work for administrative functions

## Files Modified

### Smart Contracts:
- `contracts/solidity/contracts/Intran3tAccessPass.sol` - Added self-minting
- `contracts/solidity/scripts/deploy-accesspass-v2.js` - New deployment script

### Frontend:
- `src/modules/acc3ss/Acc3ssWidget.tsx` - Auto address linking
- `src/hooks/useSubstrateEvmLink.ts` - Address mapping storage
- `src/lib/address-conversion.ts` - Substrate ↔ EVM conversion
- `src/contracts/intran3t-accesspass.ts` - Updated contract address
- `.env` - New contract address

## Summary

**The flow is now SIMPLE:**

```
Verified Identity → UI Unlocks → Click Mint → Sign Transaction → Done ✅
```

**No manual setup. No role granting. Just works.**

Every user with a verified `@parity.io` identity can:
1. Connect their Polkadot wallet
2. See all modules unlocked
3. Mint access passes for themselves
4. Use all smart contract features

The contract enforces that users can only mint for themselves (unless they're admins), and identity verification is already enforced at the UI level.
