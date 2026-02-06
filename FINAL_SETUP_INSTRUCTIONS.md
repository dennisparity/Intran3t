# Final Setup Instructions - Simple Polkadot Flow

## ✅ What's Been Fixed

1. **Smart Contract Updated** - Self-minting enabled (no role granting needed)
2. **Auto-Connect Logic** - EVM auto-requests when Substrate connects
3. **Address Linking** - Substrate ↔ EVM addresses linked automatically
4. **New Contract Deployed**: `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94`

## 🎯 Simple User Flow (What Should Happen)

### Step 1: Enable Ethereum in Your Wallet

**Before anything, make sure Ethereum is enabled in your Polkadot wallet:**

**Talisman:**
1. Open Talisman extension
2. Go to Settings → Networks & Tokens
3. Find "Ethereum" and toggle it **ON**
4. Make sure you have an Ethereum account created/imported

**SubWallet:**
1. Open SubWallet
2. Go to Settings → Manage Networks
3. Enable "Ethereum" network
4. Make sure you have an Ethereum account

### Step 2: Connect & Use

1. **Go to** `http://localhost:5173`
2. **Connect** your Polkadot wallet (Talisman/SubWallet)
3. **Approve popup** (wallet will ask for both Substrate AND EVM access)
4. **Identity check** happens automatically
   - ✅ If verified → UI unlocks
   - ❌ If not → Setup flow appears
5. **Go to Acc3ss** module
6. **Select location** (e.g., Berlin Office)
7. **Click "Mint NFT Access Pass"**
8. **Sign transaction** in your wallet
9. **Done!** ✅ Access pass minted

## 🔧 What Happens Behind the Scenes

```
1. Connect Polkadot Wallet
   ↓
2. Substrate Connection (Typink)
   ↓
3. Auto-Request EVM Accounts (window.ethereum)
   ↓
4. Wallet Popup (User Approves)
   ↓
5. EVM Provider Auto-Initializes Signer
   ↓
6. Addresses Auto-Linked in localStorage
   ↓
7. Contract Ready ✅
```

## 🐛 Troubleshooting

### Error: "Contract or signer not initialized"

**Cause:** EVM signer not initialized

**Fix:**
1. Make sure Ethereum is **enabled** in wallet settings
2. Make sure you have an **Ethereum account** in your wallet
3. **Refresh** the page at `http://localhost:5173`
4. When connecting, **approve both popups** (Substrate + EVM)
5. Check console - should see: `✅ Signer auto-initialized for: 0x...`

### No EVM Popup Appears

**Fix:**
1. Open wallet settings → Enable Ethereum
2. Create/import an Ethereum account
3. Refresh the page
4. Click "Connect EVM" button if it appears

### Wrong Network

**Fix:**
- Wallet should auto-switch to Polkadot Hub TestNet
- If not, manually add network in wallet:
  - Name: Polkadot Hub TestNet
  - RPC: `https://services.polkadothub-rpc.com/testnet`
  - Chain ID: `420420417`

### "User declined transaction"

**Fix:**
- Just approve the transaction in your wallet
- Make sure you're on the right network
- Make sure you have some PAS tokens for gas

## 📋 Verification Checklist

Run through this to make sure everything works:

- [ ] Wallet has Ethereum enabled
- [ ] Wallet has Ethereum account created
- [ ] Connect wallet → Sees 2 popups (Substrate + EVM)
- [ ] Approve both popups
- [ ] Console shows: `✅ Signer auto-initialized`
- [ ] Acc3ss module shows: "Your Addresses" with both Substrate and EVM
- [ ] Click "Mint NFT Access Pass" → No errors
- [ ] Transaction popup appears
- [ ] Approve transaction
- [ ] Pass minted successfully ✅

## 🔑 Key Files

- **Contract:** `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94`
- **Network:** Polkadot Hub TestNet (Chain ID: 420420417)
- **Explorer:** https://polkadot.testnet.routescan.io/address/0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94

## 💡 Important Notes

1. **No Manual Role Granting** - Anyone with verified identity can mint
2. **Self-Minting Only** - Users can only mint for themselves
3. **Admin Override** - Admins (with MINTER_ROLE) can mint for others
4. **Identity Check** - Verified `@parity.io` matrix handle required (enforced in UI)
5. **Two Addresses** - Your wallet provides both Substrate (identity) and EVM (contracts)

## 🎉 Success Criteria

You know it's working when:
- ✅ No "Contract or signer not initialized" error
- ✅ Transaction popup appears when clicking mint
- ✅ Console shows successful mint with token ID
- ✅ Access pass appears in your passes list
- ✅ QR code is generated and downloadable

---

**If you still get "Contract or signer not initialized", check the console and share the logs - that will help debug!**
