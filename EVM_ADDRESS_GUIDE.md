# Finding Your EVM Address from Polkadot Wallet

Your Polkadot wallet (Talisman, SubWallet, etc.) provides TWO types of addresses:

1. **Substrate Address** - Used for Polkadot identity verification (People Chain)
   - Format: `5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR`
   - Used by: `useTypink()` hook, identity verification

2. **EVM Address** - Used for smart contract interaction
   - Format: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
   - Used by: `useEVM()` hook, AccessPass/RBAC contracts

## How to Find Your EVM Address

### Option 1: Via Intran3t App (Easiest)

1. Open Intran3t app
2. Open browser console (F12 or Cmd+Option+I)
3. Run this code:

```javascript
// Connect to EVM provider
const ethereum = window.ethereum;
if (ethereum) {
  ethereum.request({ method: 'eth_requestAccounts' }).then(accounts => {
    console.log('🔑 Your EVM Address:', accounts[0]);
  });
}
```

### Option 2: Via Talisman Wallet

1. Open Talisman extension
2. Click on your account
3. Look for "Ethereum" account type
4. The address shown is your EVM address (starts with `0x`)

**Important**: Make sure "Ethereum" is enabled in Talisman settings:
- Talisman → Settings → Networks & Tokens → Ethereum → Enable

### Option 3: Via SubWallet

1. Open SubWallet
2. Switch to "Ethereum" network
3. Your address in this mode is your EVM address

## What's the Difference?

Both addresses are derived from the same seed phrase, but they use different derivation paths:

- **Substrate (SR25519)**: Used by Polkadot parachains (People Chain, Asset Hub)
- **EVM (ECDSA/secp256k1)**: Used by Ethereum-compatible smart contracts

## Grant MINTER_ROLE to Your EVM Address

Once you have your EVM address, grant it MINTER_ROLE:

```bash
cd contracts/solidity

# Grant role to your EVM address
npx hardhat run scripts/grant-minter-role.js --network polkadotHubTestnet 0xYOUR_EVM_ADDRESS
```

Example:
```bash
npx hardhat run scripts/grant-minter-role.js --network polkadotHubTestnet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## Current Setup

- **AccessPass Contract**: `0x5b10D55d22F85d4Ef9623227087c264057a52422`
- **Current MINTER**: `0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62` (deployer, no identity)
- **Your Verified Identity**: AphexTwin94 (Substrate: `5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR`)
- **Your EVM Address**: ??? (need to find from wallet)

## Expected Workflow

1. **Identity Verification** (Substrate):
   - Connect Talisman/SubWallet with Substrate account
   - App reads verified identity from People Chain
   - UI unlocks based on @parity.io verification

2. **Contract Interaction** (EVM):
   - Same wallet provides EVM address
   - Use EVM address to sign contract transactions
   - Mint access passes, manage roles, etc.

## Troubleshooting

### "No EVM provider found"
- Make sure Ethereum is enabled in wallet settings
- Try refreshing the page after enabling

### "User rejected the request"
- Approve the wallet popup when it appears
- Check if popup was blocked by browser

### "Wrong network"
- Switch to Polkadot Hub TestNet (Chain ID: 420420417)
- App should auto-prompt to add network

### "User does not have MINTER_ROLE"
- Grant MINTER_ROLE using script above
- Wait for transaction confirmation
- Refresh the app

## Next Steps

After finding and granting your EVM address:

1. ✅ Refresh Intran3t app
2. ✅ Identity verification should still work (uses Substrate address)
3. ✅ Acc3ss widget should show "Mint NFT Access Pass" button (uses EVM address)
4. ✅ Test minting an access pass

## Technical Details

**Address Derivation in Polkadot Wallets:**

Most Polkadot wallets use this approach:
- Single seed phrase → Multiple derivation paths
- Substrate path: `//polkadot` or `//` (SR25519)
- Ethereum path: `m/44'/60'/0'/0/0` (secp256k1)

This allows one wallet to manage both Substrate and EVM accounts seamlessly.
