# Acc3ss Widget - Smart Contract Quick Start

> Updated: 2026-01-22
> ✅ AccessPass contract deployed and widget updated

---

## ✅ What's Done

1. **Smart Contract Deployed**
   - Address: `0x5b10D55d22F85d4Ef9623227087c264057a52422`
   - Network: Polkadot Hub TestNet
   - Explorer: https://polkadot.testnet.routescan.io/address/0x5b10D55d22F85d4Ef9623227087c264057a52422

2. **Widget Updated**
   - Removed NFT pallet code (broken)
   - Now uses ERC-721 smart contract
   - Uses `useEVM` hook for wallet connection
   - Uses `useAccessPassContract` hook for minting

3. **Test Mint Successful**
   - Token ID #1 minted
   - Holder: `0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62`
   - Location: Berlin Office
   - Verified on-chain ✅

---

## 🔄 How to Use (Important Changes!)

### **CRITICAL: Wallet Switching Required**

The smart contract approach requires **MetaMask with EVM addresses**, NOT Polkadot wallets (Talisman/SubWallet with Substrate addresses).

**Why:**
- Old approach: NFT pallet (Substrate) → Used Polkadot addresses (`5H...`, `167j...`)
- New approach: ERC-721 smart contract (EVM) → Uses EVM addresses (`0x...`)

### **Step 1: Add Polkadot Hub TestNet to MetaMask**

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network" → "Add network manually"
4. Enter:
   - **Network Name:** Polkadot Hub TestNet
   - **RPC URL:** https://services.polkadothub-rpc.com/testnet
   - **Chain ID:** 420420417
   - **Currency Symbol:** PAS
   - **Block Explorer:** https://polkadot.testnet.routescan.io/
5. Click "Save"

### **Step 2: Get Testnet Tokens**

1. Go to: https://faucet.polkadot.io/
2. Select "Polkadot Hub TestNet"
3. Paste your EVM address (from MetaMask)
4. Request tokens
5. Wait for confirmation

### **Step 3: Connect MetaMask to App**

1. Open http://localhost:5173/
2. **Disconnect** any Polkadot wallet (Talisman/SubWallet)
3. Look for EVM wallet connection (might need to add this UI)
4. Connect MetaMask
5. Make sure it's on Polkadot Hub TestNet network

### **Step 4: Mint Access Pass**

1. Go to Dashboard → Acc3ss module
2. Select a location (e.g., "Berlin Office")
3. Click "Mint NFT Access Pass"
4. MetaMask will popup → Sign transaction
5. Wait for confirmation
6. Modal shows with QR code

---

## 🐛 Current Issues & Fixes

### Issue 1: "Create Collection" Button Still Shows
**Status:** ✅ FIXED
- Removed from new widget
- Old NFT pallet code disabled

### Issue 2: AphexTwin Account Sees Admin Panel
**Status:** ✅ FIXED
- Old widget was checking Substrate addresses
- New widget checks EVM addresses
- Your EVM admin: `0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62`

### Issue 3: No MetaMask Connection UI
**Status:** ⚠️ NEEDS ATTENTION
- App currently only shows Polkadot wallet connection
- Need to add EVM wallet (MetaMask) connection option
- Workaround: EVMProvider should handle this automatically

---

## 📋 Testing Checklist

**Before Testing:**
- [ ] MetaMask installed
- [ ] Polkadot Hub TestNet added to MetaMask
- [ ] PAS testnet tokens in wallet
- [ ] Connected to correct network (Chain ID: 420420417)

**Testing:**
- [ ] Open app at http://localhost:5173/
- [ ] Navigate to Acc3ss module
- [ ] Widget shows "Connect MetaMask" message
- [ ] No "Create Collection" admin panel visible
- [ ] Select a location
- [ ] Click "Mint NFT Access Pass"
- [ ] MetaMask popup appears
- [ ] Transaction confirms
- [ ] Modal shows with QR code and NFT details
- [ ] "View Contract" button works
- [ ] Download QR code button works

---

## 🔑 QR Code Data Format

The new QR codes contain smart contract data:

```json
{
  "version": "v1",
  "type": "smart-contract",
  "contract": "0x5b10D55d22F85d4Ef9623227087c264057a52422",
  "tokenId": 1,
  "holder": "0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62",
  "holderIdentity": "AphexTwin94",
  "location": "berlin",
  "locationName": "Berlin Office",
  "expiresAt": 1737633339,
  "issuedAt": 1737546944,
  "verified": true,
  "network": "polkadot-hub-testnet",
  "chainId": 420420417
}
```

**Verification Process:**
1. Scan QR code
2. Extract `contract` and `tokenId`
3. Call `contract.isPassValid(tokenId)` → returns true/false
4. Call `contract.getPassMetadata(tokenId)` → get full details
5. Check expiration, location, holder
6. Grant/deny access

---

## ⚠️ Known Limitations

1. **EVM Addresses Only**
   - Cannot use Polkadot addresses (5H..., 167j...)
   - Must use MetaMask with EVM addresses (0x...)

2. **Identity Display**
   - Currently tries to fetch Polkadot identity for EVM address (might fail)
   - Falls back to "User" if not found
   - TODO: Better identity integration for EVM accounts

3. **No Transfer**
   - NFTs are soulbound (cannot be transferred)
   - Only minting and burning allowed
   - By design for security

---

## 🚀 Next Steps

1. **Add MetaMask Connect Button**
   - Update Landing/Dashboard to show EVM wallet option
   - Make it clear users need MetaMask

2. **Add Identity Verification**
   - Check for @parity.io matrix handle
   - Reject minting if not verified
   - Add UI warning

3. **Admin Panel for Revocation**
   - Allow admins to revoke passes
   - Calls `contract.revokeAccessPass(tokenId)`
   - Burns the NFT

4. **QR Scanner**
   - Build scanner UI
   - Verify passes on-chain
   - Check expiration and validity

5. **Deploy to Production**
   - Deploy contract to Kusama Hub (mainnet)
   - Update .env for production
   - Test thoroughly

---

## 📞 Support

**Contract Issues:**
- Check explorer: https://polkadot.testnet.routescan.io/address/0x5b10D55d22F85d4Ef9623227087c264057a52422
- View deployment info: `contracts/solidity/deployments/accesspass-polkadotHubTestnet.json`

**Frontend Issues:**
- Check console for errors
- Verify contract address in `.env`
- Ensure MetaMask is connected to correct network

**Testing:**
- Run mint script: `cd contracts/solidity && npx hardhat run scripts/mint-pass.js --network polkadotHubTestnet`
- Check balance: `npx hardhat console --network polkadotHubTestnet`

---

**Status:** Ready for testing with MetaMask! 🎉
