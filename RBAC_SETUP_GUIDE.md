# RBAC Smart Contract Setup Guide

Complete guide for setting up and integrating the Intran3t RBAC smart contracts with Verifiable Credentials.

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **pnpm**
3. **Polkadot wallet** with EVM support (Polkadot.js Extension, Talisman, SubWallet, or Nova Wallet)
4. **Polkadot Hub EVM testnet access** (or mainnet for production)

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

#### For the Smart Contract (Solidity)

```bash
cd contracts/solidity
npm install
```

This installs:
- `hardhat` - Ethereum development environment
- `@nomicfoundation/hardhat-toolbox` - Testing and deployment tools
- `ethers` - Ethereum library

#### For the Frontend

```bash
cd /path/to/intran3t
npm install ethers
```

This adds `ethers.js` for EVM contract interaction in the React app.

### Step 2: Configure Environment Variables

Create a `.env` file in `contracts/solidity/`:

```env
# Private key for deployment (DO NOT COMMIT!)
PRIVATE_KEY=your_private_key_here

# RPC endpoints
ASSET_HUB_TESTNET_RPC=https://rpc.testnet.assethub.io
ASSET_HUB_MAINNET_RPC=https://rpc.assethub.io

# Block explorer API keys (for verification)
BLOCKSCOUT_API_KEY=your_api_key_here
```

**Important**: Add `.env` to your `.gitignore` file!

---

## 🔨 Compile and Test

### Compile the Contract

```bash
cd contracts/solidity
npm run compile
```

This generates:
- Contract bytecode
- ABI (Application Binary Interface) in `artifacts/`

### Run Tests

```bash
npm test
```

Expected output:
```
✓ Should create a new organization
✓ Should auto-grant admin role to organization creator
✓ Should issue a credential to a user
✓ Admin should have all permissions
✓ Member should have limited permissions
✓ Viewer should only have read permissions
✓ Should expire credentials after expiration time
✓ Should not allow self-revocation
... (15+ tests)
```

---

## 🌐 Deploy the Contract

### Deploy to Local Hardhat Network (Testing)

```bash
npm run deploy:local
```

### Deploy to Polkadot Hub Testnet

```bash
npm run deploy:testnet
```

### Deploy to Polkadot Hub Mainnet (Production)

```bash
npm run deploy:mainnet
```

After deployment, you'll see output like:

```
✅ Intran3tRBAC deployed to: 0x1234567890abcdef...
Network: assetHubTestnet
Deployer: 0xabcdef1234567890...

📝 Deployment info saved to deployments/assetHubTestnet.json
```

**Important**: Copy the contract address from the deployment output!

---

## ⚙️ Configure Frontend

### Step 1: Update Contract Address

Edit `/src/contracts/intran3t-rbac.ts`:

```typescript
// Replace with your deployed contract address
export const RBAC_CONTRACT_ADDRESS = '0x1234567890abcdef...'; // Your address here
```

### Step 2: Add EVMProvider to App

Edit `/src/App.tsx`:

```typescript
import { EVMProvider } from './providers/EVMProvider';

function App() {
  return (
    <EVMProvider>
      {/* Your existing app structure */}
      <Router>
        <Routes>
          {/* ... */}
        </Routes>
      </Router>
    </EVMProvider>
  );
}
```

### Step 3: Configure Polkadot Wallet for EVM

Your Polkadot wallet (Talisman, SubWallet, or Nova Wallet) must be configured for **Polkadot Hub EVM network**:

#### Option 1: Automatic Configuration (Recommended)
The app will automatically prompt to add and switch to Polkadot Hub EVM when you enable EVM mode in the Admin panel.

#### Option 2: Manual Configuration
Add Polkadot Hub EVM network manually in your wallet:
- **Network Name**: Polkadot Hub Testnet
- **RPC URL**: `https://rpc.testnet.assethub.io`
- **Chain ID**: `420420`
- **Currency Symbol**: DOT
- **Block Explorer**: `https://explorer.testnet.assethub.io`

**Note**: Most Polkadot wallets with EVM support can handle both Substrate and EVM chains. You'll use the same wallet for both Polkadot operations and RBAC smart contract interactions.

---

## 📖 Usage Examples

### Example 1: Check User Permission

```typescript
import { useEVM } from '../providers/EVMProvider';
import { useRBACContract, Action, Resource } from '../hooks/useRBACContract';

function GovernanceWidget() {
  const { provider, signer, account } = useEVM();
  const rbac = useRBACContract(provider, signer);

  const checkPermission = async () => {
    if (!account) return;

    const orgId = '0xabcd1234...'; // Your organization ID
    const canCreatePoll = await rbac.can(orgId, account, Action.Create, Resource.Poll);

    if (canCreatePoll) {
      console.log('User can create polls');
    }
  };

  return (
    <button onClick={checkPermission}>
      Check Permission
    </button>
  );
}
```

### Example 2: Create Organization (Admin)

```typescript
import { useRBACContract } from '../hooks/useRBACContract';

function AdminPanel() {
  const { provider, signer } = useEVM();
  const rbac = useRBACContract(provider, signer);

  const createOrg = async () => {
    try {
      const orgId = await rbac.createOrganization('My Organization');
      console.log('Organization created:', orgId);
      // Organization creator is automatically granted Admin role
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  return (
    <button onClick={createOrg}>
      Create Organization
    </button>
  );
}
```

### Example 3: Issue Credential (Admin)

```typescript
import { Role } from '../hooks/useRBACContract';

function IssueCredentialButton({ orgId, userAddress }: Props) {
  const { provider, signer } = useEVM();
  const rbac = useRBACContract(provider, signer);

  const issueCredential = async () => {
    try {
      // Issue Member role with no expiration (0)
      const credentialId = await rbac.issueCredential(
        orgId,
        userAddress,
        Role.Member,
        0 // No expiration
      );
      console.log('Credential issued:', credentialId);
    } catch (error) {
      console.error('Failed to issue credential:', error);
    }
  };

  return (
    <button onClick={issueCredential}>
      Grant Member Role
    </button>
  );
}
```

### Example 4: Get User Role

```typescript
function UserRoleBadge({ orgId, userAddress }: Props) {
  const { provider } = useEVM();
  const rbac = useRBACContract(provider, null);
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    rbac.getUserRole(orgId, userAddress).then(({ role, hasRole }) => {
      if (hasRole) {
        setRole(roleToString(role));
      }
    });
  }, [orgId, userAddress]);

  return <span className="badge">{role}</span>;
}
```

---

## 🔐 Security Best Practices

1. **Never commit private keys** to version control
2. **Use environment variables** for sensitive configuration
3. **Test on testnet first** before deploying to mainnet
4. **Verify contracts** on block explorer after deployment
5. **Set appropriate role permissions** - only admins should issue/revoke credentials
6. **Use expiration dates** for temporary access credentials
7. **Monitor events** for audit trail and security monitoring
8. **Backup deployment info** from `deployments/` folder

---

## 📊 Permission Matrix

| Role | Create Poll | Vote | Create Form | View Results | Manage Users | Settings |
|------|------------|------|-------------|--------------|--------------|----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Member** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ✅ (read-only) | ❌ | ❌ |

---

## 🧪 Testing Workflow

### Local Testing (Recommended)

1. Run local Hardhat node:
   ```bash
   npx hardhat node
   ```

2. Deploy to local network:
   ```bash
   npm run deploy:local
   ```

3. Configure your Polkadot wallet for local testing:
   - Network: Localhost 8545
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: 31337

4. Import a test account from Hardhat output into your wallet

5. Test in your React app

### Testnet Testing

1. Get testnet DOT from faucet
2. Deploy to testnet: `npm run deploy:testnet`
3. Update contract address in frontend
4. Enable EVM mode in your Polkadot wallet for Polkadot Hub Testnet
5. Test with real transactions

---

## 🐛 Troubleshooting

### Issue: "Contract not initialized"

**Solution**: Make sure you've:
1. Installed ethers: `npm install ethers`
2. Deployed the contract
3. Updated `RBAC_CONTRACT_ADDRESS` with deployed address
4. Enabled EVM mode in your Polkadot wallet

### Issue: "Signer required"

**Solution**: Write operations (create, issue, revoke) require a connected wallet with a signer:
```typescript
const { provider, signer } = useEVM();
const rbac = useRBACContract(provider, signer); // Pass signer
```

### Issue: "Wrong network"

**Solution**: Switch your Polkadot wallet to Polkadot Hub EVM network (Chain ID: 420420 for testnet)

### Issue: "Transaction failed"

**Possible causes**:
- Insufficient gas
- Insufficient balance
- Permission denied (not admin)
- Invalid parameters
- Credential already exists

Check the error message and transaction details in your wallet.

### Issue: "No EVM-compatible wallet found"

**Solution**: Install a Polkadot wallet with EVM support:
- **Polkadot.js Extension**: https://polkadot.js.org/extension/
- **Talisman**: https://talisman.xyz
- **SubWallet**: https://subwallet.app
- **Nova Wallet**: https://novawallet.io

**Note**: For RBAC smart contract features, Talisman or SubWallet are recommended as they have robust EVM support.

---

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Polkadot Hub Documentation](https://wiki.polkadot.network/docs/learn-assets)
- [Polkadot.js Extension](https://polkadot.js.org/extension/)
- [Polkadot.js Apps](https://polkadot.js.org/apps/)
- [Talisman Wallet](https://talisman.xyz)
- [SubWallet](https://subwallet.app)
- [Nova Wallet](https://novawallet.io)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [Contract Source Code](./contracts/solidity/contracts/Intran3tRBAC.sol)
- [Contract Tests](./contracts/solidity/test/Intran3tRBAC.test.js)

---

## 🔄 Next Steps

After completing this setup:

1. ✅ Deploy contract to testnet
2. ✅ Create your first organization
3. ✅ Issue credentials to team members
4. ✅ Integrate permission checks in UI components
5. ✅ Test role-based access control
6. ✅ Monitor events for audit trail
7. ✅ Deploy to mainnet when ready

---

## 📝 License

MIT License - see LICENSE file for details
