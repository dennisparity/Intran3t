# Quick Start: Deploy RBAC Smart Contract to Asset Hub

## ✅ What's Already Done

Your smart contract is **already written** and ready to deploy! It's located at:
```
/contracts/solidity/contracts/Intran3tRBAC.sol
```

The contract includes:
- ✅ Organization management
- ✅ Verifiable Credentials (VCs)
- ✅ Role-based permissions (Admin/Member/Viewer)
- ✅ Full test suite
- ✅ Deployment scripts

---

## 🚀 Deployment Steps

### Step 1: Install ethers.js (Frontend)

**Try one of these methods:**

**Option A: Using npm**
```bash
cd /Users/dennisschiessl/Claude\ Code/Intran3t
npm install ethers
```

**Option B: Using yarn (if npm fails)**
```bash
cd /Users/dennisschiessl/Claude\ Code/Intran3t
yarn add ethers
```

**Option C: Using pnpm**
```bash
cd /Users/dennisschiessl/Claude\ Code/Intran3t
pnpm add ethers
```

This fixes the "provider not initialized" error.

---

### Step 2: Install Contract Dependencies

```bash
cd contracts/solidity
npm install
```

This installs:
- Hardhat (Ethereum development environment)
- Testing tools
- Deployment utilities

---

### Step 3: Compile the Contract

```bash
cd contracts/solidity
npm run compile
```

Expected output:
```
✓ Compiled 1 Solidity file successfully
```

This creates the contract bytecode and ABI in `artifacts/` folder.

---

### Step 4: Run Tests (Optional but Recommended)

```bash
npm test
```

Expected output: **15+ tests passing** ✅
- Organization creation
- Credential issuance
- Permission checks
- Expiration handling
- Revocation logic

---

### Step 5: Configure Deployment

Create a `.env` file in `/contracts/solidity/`:

```bash
cd contracts/solidity
touch .env
```

Add your deployment configuration:

```env
# Private key for deployment (DO NOT COMMIT!)
PRIVATE_KEY=your_private_key_here

# Asset Hub Testnet RPC (Paseo)
ASSET_HUB_TESTNET_RPC=wss://paseo-asset-hub-rpc.polkadot.io

# Optional: Block explorer API for verification
BLOCKSCOUT_API_KEY=
```

**⚠️ IMPORTANT**:
1. Never commit `.env` to git!
2. Make sure `.env` is in your `.gitignore`

**Where to get your private key:**
- Export from your Polkadot wallet (Talisman/SubWallet)
- Or create a new test account for deployment
- Make sure the account has PAS tokens for gas fees (get from faucet)

---

### Step 6: Get Testnet PAS Tokens

You need **PAS tokens** on Asset Hub testnet (Paseo) for deployment gas fees.

**Option 1: Paseo Faucet**
1. Visit: https://faucet.polkadot.io/paseo
2. Select "Asset Hub (Paseo)"
3. Enter your address
4. Request PAS tokens

**Option 2: Matrix Faucet**
1. Join Polkadot Discord/Matrix: https://matrix.to/#/#paseo-faucet:parity.io
2. Request PAS tokens in faucet channel

**Note**: You need a small amount of PAS (~0.1 PAS) for deploying the contract and initial transactions.

---

### Step 7: Update Hardhat Config for Asset Hub

The hardhat config is already set up! Check `/contracts/solidity/hardhat.config.js`:

```javascript
module.exports = {
  networks: {
    assetHubTestnet: {
      url: process.env.ASSET_HUB_TESTNET_RPC || "wss://paseo-asset-hub-rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420, // Asset Hub Testnet
    }
  }
}
```

If you need to update the RPC endpoint for Paseo Asset Hub, edit this file.

---

### Step 8: Deploy to Asset Hub Testnet

```bash
cd contracts/solidity
npm run deploy:testnet
```

Expected output:
```
Deploying Intran3tRBAC contract...
✅ Intran3tRBAC deployed to: 0x1234567890abcdef...
Network: assetHubTestnet
Deployer: 0xabcdef1234567890...

📝 Deployment info saved to deployments/assetHubTestnet.json
```

**🎉 COPY THE CONTRACT ADDRESS!** You'll need it in Step 9.

---

### Step 9: Update Frontend with Contract Address

Edit `/src/contracts/intran3t-rbac.ts`:

```typescript
// Line 8: Update with your deployed address
export const RBAC_CONTRACT_ADDRESS = '0xYOUR_DEPLOYED_ADDRESS_HERE';
```

Replace `0xYOUR_DEPLOYED_ADDRESS_HERE` with the address from Step 8.

---

### Step 10: Test the Integration

1. **Start your app:**
   ```bash
   cd /Users/dennisschiessl/Claude\ Code/Intran3t
   npm run dev
   ```

2. **Navigate to Admin Panel:**
   - Go to http://localhost:5173/admin (or your dev URL)
   - Click "RBAC" section

3. **Enable EVM Mode:**
   - Click "Enable EVM Mode"
   - Your Polkadot wallet will prompt to connect
   - Approve the connection
   - Wallet will ask to switch to Asset Hub EVM network
   - Approve the network switch

4. **Create Organization:**
   - Click "Create Organization"
   - Enter organization name (e.g., "Intran3t Test")
   - Confirm transaction in wallet
   - Wait for confirmation
   - Your organization ID will be saved!

5. **Issue Credentials:**
   - Go to "Users" section
   - Click "Edit" on a user
   - Select role (Admin/Member/Viewer)
   - Click "Issue Credential"
   - Confirm transaction
   - Credential is now on-chain! 🎉

---

## 🐛 Troubleshooting

### Issue: "npm install fails"

**Try:**
```bash
# Clear npm cache
npm cache clean --force

# Try with legacy peer deps
npm install ethers --legacy-peer-deps

# Or use yarn
yarn add ethers

# Or use pnpm
pnpm add ethers
```

### Issue: "Cannot find module 'hardhat'"

**Solution:**
```bash
cd contracts/solidity
npm install
```

### Issue: "Insufficient funds for gas"

**Solution:**
- Get more PAS tokens from faucet: https://faucet.polkadot.io/paseo
- Make sure you're on Asset Hub (Paseo), not Paseo relay chain
- Verify your account has PAS balance

### Issue: "Wrong network"

**Solution:**
- Your wallet should be on **Asset Hub Testnet (Paseo)**
- Chain ID: 420420
- RPC: wss://paseo-asset-hub-rpc.polkadot.io

### Issue: "Provider not initialized"

**Solution:**
1. Make sure ethers.js is installed: `npm install ethers`
2. Restart your dev server: `npm run dev`
3. Clear browser cache

### Issue: "Transaction fails"

**Possible causes:**
- Insufficient gas (get more PAS tokens from faucet)
- Wrong network (switch to Asset Hub Paseo testnet)
- Contract not deployed (check deployment step)
- Wrong contract address (verify in frontend config)

---

## 📊 Verification

After deployment, verify your contract works by:

1. **Check deployment info:**
   ```bash
   cat contracts/solidity/deployments/assetHubTestnet.json
   ```

2. **View on block explorer:**
   - Asset Hub testnet explorer
   - Search for your contract address
   - View transactions

3. **Test in frontend:**
   - Create organization ✅
   - Issue credential ✅
   - Check permissions ✅

---

## 🎯 What You'll Have

After completing these steps:

✅ **Smart contract deployed** to Asset Hub testnet (Paseo)
✅ **Frontend connected** to your contract
✅ **Organization created** on-chain
✅ **Credentials issued** as Verifiable Credentials
✅ **Permissions enforced** by smart contract

---

## 📝 Next Steps

1. **Test thoroughly** on testnet
2. **Add more team members** via credential issuance
3. **Test permission checks** in your app
4. **Monitor events** for audit trail
5. **When ready**: Deploy to mainnet with `npm run deploy:mainnet`

---

## 🆘 Need Help?

If you get stuck:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Check contract test logs: `cd contracts/solidity && npm test`
4. Verify your `.env` configuration
5. Make sure you have PAS tokens in your account

---

## 🔗 Useful Links

- **Asset Hub Testnet Explorer**: https://assethub-paseo.subscan.io/
- **Paseo Faucet**: https://faucet.polkadot.io/
- **Polkadot.js Apps (Paseo)**: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fpaseo-asset-hub-rpc.polkadot.io#/explorer
- **Your Contract Code**: `/contracts/solidity/contracts/Intran3tRBAC.sol`
- **Your Tests**: `/contracts/solidity/test/Intran3tRBAC.test.js`

---

**Ready to deploy? Start with Step 1!** 🚀
