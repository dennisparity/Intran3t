# Intran3t AccessPass Contract - Deployment Guide

> ERC-721 NFT Smart Contract for Location-Based Access Control
> Network: Polkadot Hub TestNet
> Last Updated: 2026-01-22

---

## Overview

The AccessPass contract is an ERC-721 NFT that provides decentralized access control for physical locations. Unlike the failed NFT pallet approach, this uses Polkadot Hub's EVM layer, which matches your RBAC contract architecture.

**Benefits:**
- ✅ Uses same EVM infrastructure as RBAC
- ✅ Works with MetaMask/EVM wallets
- ✅ Can be deployed via Remix (same as RBAC)
- ✅ Consistent ethers.js integration

---

## Prerequisites

### 1. Network Setup
- **Network:** Polkadot Hub TestNet
- **Chain ID:** 420420417 (hex: 0x1909B741)
- **RPC URL:** https://services.polkadothub-rpc.com/testnet
- **Explorer:** https://polkadot.testnet.routescan.io/
- **Currency:** PAS

### 2. Wallet Setup
- MetaMask with Polkadot Hub TestNet configured
- PAS testnet tokens (get from: https://faucet.polkadot.io/)
- Your EVM address needs ~0.1 PAS for deployment

### 3. Tools Required
- Node.js & npm (for Hardhat deployment)
- OR Remix IDE (for browser deployment)

---

## Deployment Method 1: Hardhat (Recommended)

### Step 1: Install Dependencies

```bash
cd contracts/solidity
npm install
```

### Step 2: Configure Hardhat

Check `hardhat.config.js` has Polkadot Hub TestNet:

```javascript
polkadotHubTestnet: {
  url: 'https://services.polkadothub-rpc.com/testnet',
  chainId: 420420417,
  accounts: [process.env.PRIVATE_KEY]
}
```

### Step 3: Set Private Key

Create `.env` in `contracts/solidity/`:

```bash
PRIVATE_KEY=your_metamask_private_key_here
```

**⚠️ NEVER commit `.env` to git!**

### Step 4: Deploy Contract

```bash
npx hardhat run scripts/deploy-accesspass.js --network polkadotHubTestnet
```

**Expected output:**
```
Deploying Intran3tAccessPass contract...
✅ Intran3tAccessPass deployed to: 0x...
Network: polkadotHubTestnet
Deployer: 0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62

🔑 Roles granted to deployer:
  - DEFAULT_ADMIN_ROLE
  - ADMIN_ROLE
  - MINTER_ROLE

📝 Deployment info saved to deployments/accesspass-polkadotHubTestnet.json
```

### Step 5: Copy Contract Address

Save the contract address, you'll need it for the frontend:

```
0x... (your deployed contract address)
```

---

## Deployment Method 2: Remix IDE (Alternative)

### Step 1: Open Remix

Go to: https://remix.ethereum.org/

### Step 2: Create Contract File

1. Create new file: `Intran3tAccessPass.sol`
2. Copy contents from: `contracts/solidity/contracts/Intran3tAccessPass.sol`
3. Paste into Remix

### Step 3: Install Dependencies

Remix will auto-import OpenZeppelin contracts:
- `@openzeppelin/contracts/token/ERC721/ERC721.sol`
- `@openzeppelin/contracts/access/AccessControl.sol`

### Step 4: Compile

1. Go to "Solidity Compiler" tab
2. Select compiler version: `0.8.20+`
3. Click "Compile Intran3tAccessPass.sol"
4. Check for any errors

### Step 5: Deploy

1. Go to "Deploy & Run Transactions" tab
2. Environment: "Injected Provider - MetaMask"
3. MetaMask will prompt - select Polkadot Hub TestNet
4. Contract: Select "Intran3tAccessPass"
5. Click "Deploy"
6. Sign transaction in MetaMask
7. Wait for confirmation

### Step 6: Copy Contract Address

After deployment, copy the contract address from Remix's "Deployed Contracts" section.

---

## Post-Deployment: Frontend Integration

### Step 1: Update Environment Variables

Add to your `.env` file (in project root):

```bash
VITE_ACCESSPASS_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE
```

### Step 2: Update Config

Edit `src/contracts/intran3t-accesspass.ts`:

```typescript
export const ACCESSPASS_CONTRACT_ADDRESS =
  import.meta.env.VITE_ACCESSPASS_CONTRACT_ADDRESS ||
  '0xYOUR_CONTRACT_ADDRESS_HERE'; // Fallback
```

### Step 3: Restart Dev Server

```bash
# Kill current server (Ctrl+C)
npm run dev
```

---

## Testing the Contract

### Test 1: Mint an Access Pass

```bash
cd contracts/solidity
npx hardhat run scripts/mint-pass.js --network polkadotHubTestnet
```

**Expected output:**
```
Minting access pass on polkadotHubTestnet...
Contract: 0x...
Minter: 0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62

Minting with parameters:
  To: 0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62
  Location: Berlin Office
  Location ID: berlin
  Expires At: Wed Jan 23 2026 12:53:00 GMT+0100
  Access Level: standard
  Identity: Test User

✅ Transaction confirmed in block 1234567

🎫 Access Pass Minted!
   Token ID: 1
   Holder: 0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62
   Location: Berlin Office

📋 Pass Metadata:
   Location: Berlin Office
   Location ID: berlin
   Holder: 0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62
   Issued At: Tue Jan 22 2026 12:53:00 GMT+0100
   Expires At: Wed Jan 23 2026 12:53:00 GMT+0100
   Access Level: standard
   Revoked: false
   Valid: ✅
```

### Test 2: Check on Block Explorer

Visit: https://polkadot.testnet.routescan.io/address/YOUR_CONTRACT_ADDRESS

You should see:
- Contract creation transaction
- Mint transaction(s)
- Contract verified (if using Hardhat with verification)

### Test 3: Test Frontend Integration

1. Open app: http://localhost:5173/
2. Connect MetaMask (must use EVM wallet, not Polkadot wallet!)
3. Go to Acc3ss module
4. Select a location
5. Click "Mint NFT Access Pass"
6. Sign transaction in MetaMask
7. Should see success modal with QR code

---

## Granting Minter Role to Others

Only admins can mint by default. To allow others to mint:

### Option 1: Via Script

Edit `scripts/grant-minter.js` (create this file):

```javascript
const hre = require("hardhat");

async function main() {
  const contractAddress = "0xYOUR_CONTRACT_ADDRESS";
  const newMinter = "0xADDRESS_TO_GRANT";

  const AccessPass = await hre.ethers.getContractFactory("Intran3tAccessPass");
  const contract = AccessPass.attach(contractAddress);

  const tx = await contract.grantMinterRole(newMinter);
  await tx.wait();

  console.log(`✅ Minter role granted to ${newMinter}`);
}

main().then(() => process.exit(0)).catch(console.error);
```

Run:
```bash
npx hardhat run scripts/grant-minter.js --network polkadotHubTestnet
```

### Option 2: Via Remix

1. Load contract in Remix (use "At Address" with deployed address)
2. Call `grantMinterRole("0xADDRESS")`
3. Sign transaction

### Option 3: Via Frontend (TODO)

We'll add admin panel UI for this.

---

## Contract Features

### Access Control
- **Soulbound:** NFTs cannot be transferred (only minted and burned)
- **Expiration:** Passes can have expiry dates
- **Revocation:** Admins can revoke (burn) passes
- **Role-based:** ADMIN_ROLE and MINTER_ROLE

### Metadata
Each pass stores:
- `location`: "Berlin Office"
- `locationId`: "berlin"
- `holder`: 0x address
- `issuedAt`: Unix timestamp
- `expiresAt`: Unix timestamp (0 = never)
- `accessLevel`: "standard", "premium", etc.
- `revoked`: boolean
- `identityDisplay`: On-chain identity name

### Query Functions
- `getPassMetadata(tokenId)` - Get pass details
- `isPassValid(tokenId)` - Check if valid (not expired/revoked)
- `getPassesByHolder(address)` - Get all passes for user
- `getPassesByLocation(locationId)` - Get all passes for location
- `totalMinted()` - Total passes minted

---

## Troubleshooting

### "Insufficient funds"
- Get PAS tokens from faucet: https://faucet.polkadot.io/
- Need ~0.1 PAS for deployment, ~0.01 PAS per mint

### "Contract not found"
- Check contract address is correct
- Verify on explorer: https://polkadot.testnet.routescan.io/
- Make sure you're on the right network

### "Method not found"
- This was the NFT pallet error - should NOT happen with smart contract
- If it does, check RPC URL is correct

### MetaMask not connecting
- Add Polkadot Hub TestNet manually:
  - Network Name: Polkadot Hub TestNet
  - RPC URL: https://services.polkadothub-rpc.com/testnet
  - Chain ID: 420420417
  - Currency: PAS
  - Explorer: https://polkadot.testnet.routescan.io/

---

## Next Steps

After successful deployment:

1. ✅ Update `.env` with contract address
2. ✅ Test minting via script
3. ✅ Verify contract on explorer
4. ⏳ Update Acc3ss widget to use smart contract (in progress)
5. ⏳ Add identity verification (check @parity.io matrix)
6. ⏳ Add QR code scanning/verification
7. ⏳ Deploy to production

---

## Security Considerations

- ✅ Uses OpenZeppelin audited contracts (ERC721, AccessControl)
- ✅ Soulbound (no transfers = no stealing)
- ✅ Role-based access control
- ✅ Revocation support
- ⚠️ No upgradability (deploy new version if needed)
- ⚠️ Admin key security is critical

---

## Deployed Contracts

### Testnet
- **Network:** Polkadot Hub TestNet
- **Address:** TBD (after deployment)
- **Deployer:** TBD
- **Block:** TBD

### Mainnet
- **Network:** Polkadot Hub
- **Address:** Not deployed yet
- **Deployer:** TBD
- **Block:** TBD

---

**Questions?** Check the contract code at `contracts/solidity/contracts/Intran3tAccessPass.sol`
