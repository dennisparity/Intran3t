# Intran3t RBAC Smart Contracts

Role-Based Access Control smart contracts for Intran3t organization management with Verifiable Credentials.

## 📁 Structure

```
contracts/
├── intran3t_rbac/          # ink! Smart Contract (Substrate native)
│   ├── Cargo.toml
│   └── lib.rs
│
└── solidity/               # Solidity Smart Contract (EVM compatible)
    ├── contracts/
    │   └── Intran3tRBAC.sol
    ├── scripts/
    │   └── deploy.js
    ├── test/
    │   └── Intran3tRBAC.test.js
    ├── hardhat.config.js
    └── package.json
```

## 🎯 Contract Options

### 1. Solidity Contract (Recommended)

**Use Case:** Polkadot Asset Hub EVM compatibility layer

**Advantages:**
- Deploy to Asset Hub EVM
- Wider Ethereum tooling support
- Familiar Solidity syntax
- Hardhat testing framework
- Easy integration with existing Web3 libraries

**Deployment Targets:**
- Asset Hub Testnet (EVM)
- Asset Hub Mainnet (EVM)
- Local Hardhat network

### 2. ink! Contract (Alternative)

**Use Case:** Native Substrate pallets

**Advantages:**
- Native Substrate integration
- Lower gas costs
- Direct pallet-level access
- Rust safety guarantees

**Deployment Targets:**
- Substrate-based parachains with Contracts pallet
- Rococo testnet
- Any Substrate chain with ink! support

---

## 🚀 Getting Started: Solidity Contract

### Installation

```bash
cd contracts/solidity
npm install
```

### Configuration

Create a `.env` file:

```env
# Private key for deployment (DO NOT COMMIT!)
PRIVATE_KEY=your_private_key_here

# RPC endpoints
ASSET_HUB_TESTNET_RPC=https://rpc.testnet.assethub.io
ASSET_HUB_MAINNET_RPC=https://rpc.assethub.io

# Block explorer API keys (for verification)
BLOCKSCOUT_API_KEY=your_api_key_here
```

### Compile

```bash
npm run compile
```

### Test

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
```

### Deploy

**Local (Hardhat Network):**
```bash
npm run deploy:local
```

**Asset Hub Testnet:**
```bash
npm run deploy:testnet
```

**Asset Hub Mainnet:**
```bash
npm run deploy:mainnet
```

After deployment, note the contract address for frontend integration.

---

## 📋 Contract Features

### Organization Management

```solidity
// Create new organization
function createOrganization(string memory name) returns (bytes32 orgId)

// Get organization details
function getOrganization(bytes32 orgId) returns (Organization memory)

// Get organization members
function getOrganizationMembers(bytes32 orgId) returns (address[] memory)
```

### Credential Issuance (Verifiable Credentials)

```solidity
// Issue role credential to user
function issueCredential(
    bytes32 orgId,
    address subject,
    Role role,           // Admin, Member, or Viewer
    uint256 expiresAt    // 0 for no expiration
) returns (bytes32 credentialId)

// Revoke user's credential
function revokeCredential(bytes32 orgId, address subject)

// Update user's role
function updateRole(bytes32 orgId, address subject, Role newRole)
```

### Permission Checks

```solidity
// Check if user has permission
function hasPermission(
    bytes32 orgId,
    address user,
    Action action,       // Create, Read, Update, Delete, Admin, Vote, Manage
    Resource resource    // Poll, Form, Governance, User, Settings
) returns (bool)

// Get user's role
function getUserRole(bytes32 orgId, address user)
    returns (Role role, bool hasRole)

// Get full credential
function getCredential(bytes32 orgId, address user)
    returns (Credential memory)
```

### Role & Permission Matrix

| Role | Create Poll | Vote | Create Form | View Results | Manage Users | Settings |
|------|------------|------|-------------|--------------|--------------|----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Member** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ✅ (read-only) | ❌ | ❌ |

---

## 🔗 Frontend Integration

### 1. Copy Contract ABI

After compiling, copy the ABI from:
```
contracts/solidity/artifacts/contracts/Intran3tRBAC.sol/Intran3tRBAC.json
```

### 2. Create TypeScript Types

```typescript
// src/contracts/intran3t-rbac.ts
import { ethers } from 'ethers';

export const RBAC_CONTRACT_ADDRESS = '0x...'; // From deployment

export const RBAC_ABI = [ /* paste ABI here */ ];

export enum Role {
  Admin = 0,
  Member = 1,
  Viewer = 2
}

export enum Action {
  Create = 0,
  Read = 1,
  Update = 2,
  Delete = 3,
  Admin = 4,
  Vote = 5,
  Manage = 6
}

export enum Resource {
  Poll = 0,
  Form = 1,
  Governance = 2,
  User = 3,
  Settings = 4,
  All = 5
}
```

### 3. Create React Hook

```typescript
// src/hooks/useRBAC.ts
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { RBAC_CONTRACT_ADDRESS, RBAC_ABI, Action, Resource } from '../contracts/intran3t-rbac';

export function useRBAC(orgId: string, userAddress: string | undefined) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [role, setRole] = useState<number | null>(null);

  useEffect(() => {
    if (!userAddress) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const rbacContract = new ethers.Contract(
      RBAC_CONTRACT_ADDRESS,
      RBAC_ABI,
      provider
    );

    setContract(rbacContract);

    // Fetch user role
    rbacContract.getUserRole(orgId, userAddress).then(([userRole, hasRole]) => {
      if (hasRole) {
        setRole(userRole);
      }
    });
  }, [orgId, userAddress]);

  const can = async (action: Action, resource: Resource): Promise<boolean> => {
    if (!contract || !userAddress) return false;

    return await contract.hasPermission(orgId, userAddress, action, resource);
  };

  return { role, can, contract };
}
```

### 4. Use in Components

```typescript
// Example: GovernanceWidget.tsx
import { useRBAC } from '../hooks/useRBAC';
import { Action, Resource } from '../contracts/intran3t-rbac';

export function GovernanceWidget() {
  const { can } = useRBAC(ORG_ID, userAddress);
  const [canCreatePoll, setCanCreatePoll] = useState(false);

  useEffect(() => {
    can(Action.Create, Resource.Poll).then(setCanCreatePoll);
  }, [can]);

  return (
    <div>
      {canCreatePoll && <CreatePollButton />}
      {/* ... */}
    </div>
  );
}
```

---

## 🔐 Security Considerations

1. **Admin Keys**: Keep private keys secure. Never commit to version control.
2. **Role Management**: Only admins can issue/revoke credentials.
3. **Expiration**: Set expiration times for temporary access.
4. **Audit Trail**: All actions emit events for transparency.
5. **Self-Revocation**: Admins cannot revoke their own credentials (prevents lockout).

---

## 📝 Verifiable Credentials (VCs)

Each role assignment issues a **W3C-compliant Verifiable Credential**:

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "OrganizationRoleCredential"],
  "issuer": "did:polkadot:5G...",
  "issuanceDate": "2024-01-15T00:00:00Z",
  "expirationDate": "2025-01-15T00:00:00Z",
  "credentialSubject": {
    "id": "did:polkadot:5F...",
    "organizationId": "0xabcd1234...",
    "role": "Admin",
    "permissions": ["admin:all", "poll:create", "user:manage"]
  },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2024-01-15T00:00:00Z",
    "verificationMethod": "0x123...",
    "proofValue": "0xabcd..."
  }
}
```

---

## 🧪 Testing

Run the full test suite:

```bash
cd contracts/solidity
npm test
```

Test coverage includes:
- ✅ Organization creation
- ✅ Credential issuance and revocation
- ✅ Role updates
- ✅ Permission checks for all roles
- ✅ Expiration handling
- ✅ Member tracking
- ✅ Event emissions

---

## 📦 Deployment Info

After deployment, contract info is saved to:
```
contracts/solidity/deployments/<network>.json
```

Example:
```json
{
  "network": "assetHubTestnet",
  "contractAddress": "0x1234567890abcdef...",
  "deployer": "0xabcdef1234567890...",
  "deployedAt": "2024-01-15T12:00:00.000Z",
  "blockNumber": 12345678
}
```

---

## 🔄 Contract Upgrades

The current contract is **not upgradeable** for security and simplicity.

If you need upgrades:
1. Deploy new contract version
2. Migrate organization data
3. Update frontend contract address

For upgradeable contracts, consider using OpenZeppelin's upgradeable contracts pattern.

---

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [Polkadot Asset Hub](https://wiki.polkadot.network/docs/learn-assets)

---

## 🐛 Troubleshooting

**Issue: Contract deployment fails**
- Check that you have enough balance for gas
- Verify RPC endpoint is correct
- Ensure private key has permission

**Issue: Tests fail**
- Run `npm install` to ensure dependencies are installed
- Check Hardhat version compatibility
- Clear cache: `npx hardhat clean`

**Issue: Permission checks return false unexpectedly**
- Verify user has been issued a credential
- Check credential hasn't been revoked
- Ensure credential hasn't expired

---

## 📄 License

MIT License - see LICENSE file for details
