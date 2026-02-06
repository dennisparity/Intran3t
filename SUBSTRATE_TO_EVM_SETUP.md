# Substrate-to-EVM Address Setup for AccessPass

## The Problem

You have:
- ✅ **Verified Polkadot Identity** (AphexTwin94) on Substrate address: `5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR`
- ✅ **AccessPass Smart Contract** deployed at: `0x5b10D55d22F85d4Ef9623227087c264057a52422`
- ❌ **But**: Your deployer EVM address (`0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62`) has MINTER_ROLE but no identity

## The Solution

Your Polkadot wallet provides **TWO** addresses from the same seed:
1. **Substrate Address** - For identity verification (People Chain)
2. **EVM Address** - For smart contract interaction

You need to find your **EVM address** and grant it MINTER_ROLE.

---

## Step 1: Find Your EVM Address

### Method A: Use the Helper Page (Easiest)

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open in browser:
   ```
   http://localhost:5173/find-evm-address.html
   ```

3. Click "Connect Wallet"
4. Approve in Talisman/SubWallet
5. Copy your EVM address

### Method B: Browser Console

1. Open Intran3t app: `http://localhost:5173`
2. Open browser console (F12 or Cmd+Option+I)
3. Run this code:

```javascript
window.ethereum.request({ method: 'eth_requestAccounts' })
  .then(accounts => {
    console.log('🔑 Your EVM Address:', accounts[0]);
    console.log('Copy this address to grant MINTER_ROLE');
  })
```

### Method C: Wallet Extension

**Talisman:**
1. Open Talisman extension
2. Make sure "Ethereum" is enabled (Settings → Networks & Tokens → Ethereum)
3. Switch to Ethereum network
4. Your address shown is your EVM address

**SubWallet:**
1. Open SubWallet
2. Switch to "Ethereum" or "EVM" mode
3. Your address in this mode is your EVM address

---

## Step 2: Grant MINTER_ROLE to Your EVM Address

Once you have your EVM address (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`):

```bash
cd contracts/solidity

# Grant MINTER_ROLE to your EVM address
npx hardhat run scripts/grant-minter-role.js \
  --network polkadotHubTestnet \
  0xYOUR_EVM_ADDRESS_HERE
```

**Example:**
```bash
npx hardhat run scripts/grant-minter-role.js \
  --network polkadotHubTestnet \
  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

Expected output:
```
🔑 Granting MINTER_ROLE to AccessPass contract
   Contract: 0x5b10D55d22F85d4Ef9623227087c264057a52422
   Target: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

   Signer: 0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62

✅ Signer has ADMIN_ROLE

📝 Granting MINTER_ROLE...
   Transaction hash: 0x...
   ⏳ Waiting for confirmation...
   ✅ Transaction confirmed in block: 4567890

✅ MINTER_ROLE successfully granted!
   Address 0x742d35... can now mint access passes
```

---

## Step 3: Test in Intran3t App

1. Refresh the app: `http://localhost:5173`

2. Connect your Polkadot wallet (Substrate)
   - UI verifies your identity (AphexTwin94)
   - Modules unlock (Acc3ss, Governance, etc.)

3. Go to Acc3ss module

4. You should now see:
   ```
   Your Addresses:
   Substrate (Identity): 5HBSKcu1...r4kR
   EVM (Contract): 0x742d35...f0bEb
   ```

5. Select a location and click "Mint NFT Access Pass"

6. Sign transaction with your EVM address

7. Verify the NFT was minted!

---

## How It Works

```
┌─────────────────────────────────────┐
│   Polkadot Wallet (Talisman)       │
│   Single Seed Phrase                │
├─────────────────────────────────────┤
│                                     │
│  Substrate Path (SR25519)          │
│  ├─ Address: 5HBSKcu1...           │
│  ├─ Purpose: Identity verification │
│  └─ Connects to: People Chain      │
│                                     │
│  EVM Path (secp256k1)              │
│  ├─ Address: 0x742d35...           │
│  ├─ Purpose: Smart contracts       │
│  └─ Connects to: Polkadot Hub EVM  │
│                                     │
└─────────────────────────────────────┘
```

**Authentication Flow:**
1. User connects with **Substrate address** (via Typink)
2. App verifies identity on People Chain
3. UI unlocks based on verified identity
4. User mints access pass using **EVM address** (via useEVM)
5. Same wallet, two addresses, seamless UX!

---

## Current Configuration

| Item | Value |
|------|-------|
| **AccessPass Contract** | `0x5b10D55d22F85d4Ef9623227087c264057a52422` |
| **Network** | Polkadot Hub TestNet (Chain ID: 420420417) |
| **RPC** | `https://services.polkadothub-rpc.com/testnet` |
| **Explorer** | `https://polkadot.testnet.routescan.io` |
| **Your Verified Identity** | AphexTwin94 (Substrate) |
| **Your Substrate Address** | `5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR` |
| **Your EVM Address** | ??? (find using steps above) |

---

## Troubleshooting

### "No EVM provider found"
- Make sure Ethereum is enabled in Talisman/SubWallet settings
- Refresh the page after enabling

### "User does not have MINTER_ROLE"
- Make sure you granted MINTER_ROLE to the correct EVM address
- Check transaction on explorer to confirm it succeeded
- Refresh the app

### "Wrong network"
- Switch to Polkadot Hub TestNet in your wallet
- Chain ID should be 420420417
- App will auto-prompt to add the network

### "Two different addresses showing"
- This is normal! Your wallet provides both:
  - Substrate address (for identity)
  - EVM address (for contracts)
- They're derived from the same seed but serve different purposes

---

## Files Modified

1. **`contracts/solidity/scripts/grant-minter-role.js`** - Script to grant MINTER_ROLE
2. **`src/modules/acc3ss/Acc3ssWidget.tsx`** - Shows both addresses for debugging
3. **`public/find-evm-address.html`** - Helper page to find EVM address
4. **`EVM_ADDRESS_GUIDE.md`** - Detailed guide
5. **`SUBSTRATE_TO_EVM_SETUP.md`** - This file

---

## Next Steps

After completing this setup, you'll be able to:
- ✅ Authenticate with your verified Polkadot identity (Substrate)
- ✅ Mint access passes with your EVM address (smart contract)
- ✅ Seamless UX with a single wallet managing both addresses

The same pattern applies to:
- RBAC contract (role management)
- Any future smart contracts
- All Polkadot Hub EVM features

**Key Insight:** In the ideal Polkadot ecosystem, users only need ONE wallet with ONE seed phrase, but it provides addresses for BOTH Substrate (identity/governance) and EVM (smart contracts) operations.
