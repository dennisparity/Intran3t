# Intran3t - Decentralized Access Control & Identity Platform

> **Product Owner:** Dennis Schiessl, Parity Technologies
> **Target Distribution:** Polkadot Triad (Polkadot.com, Mobile App, Desktop)
> **Last Updated:** February 6, 2026

---

## 🎯 Project Overview
<img width="1140" height="712" alt="Screenshot 2026-02-11 at 11 35 28" src="https://github.com/user-attachments/assets/1f0f5912-1f09-432c-9223-46e9df21c21b" />


### Purpose
Intran3t is a fully web3 "intran3t-app" that integrates key workplace functions and functionalities as plugins under a single interface, run fully on Polkadot. The dapp demonstrates role-base access managements for web3 users while enabling isolated functionalities and chain interactions per module.

### Key Features
- **On-Chain Identity:** Real-time identity verification from Polkadot People Chain with social account display (Matrix, Twitter, GitHub, Discord)
<img width="282" height="196" alt="Screenshot 2025-12-18 at 18 04 49" src="https://github.com/user-attachments/assets/e4f2b7e5-eac2-4c21-b904-57c9b4b35870" />

- **RBAC Smart Contracts:** Role-based access control with W3C Verifiable Credentials on Polkadot Hub EVM
- <img width="1195" height="554" alt="Screenshot 2026-01-12 at 09 45 09" src="https://github.com/user-attachments/assets/66c53ac4-f5a0-4bf7-b0e7-7e22aaea3559" />

  - Organization management with on-chain credential issuance
  - Permission matrix (Admin/Member/Viewer/PeopleCulture roles)
  - Expiration and revocation support
  - Integration with Polkadot wallets (Talisman, SubWallet) for EVM operations
  - **User Management**
  - <img width="1167" height="451" alt="Screenshot 2026-01-12 at 09 45 15" src="https://github.com/user-attachments/assets/3dd2273f-d364-4976-a519-48c524cb84ec" />
- **Access Passes:** Mint, manage, and verify location-based access passes as ERC-721 NFTs via smart contracts
- **Forms:** Create privacy-preserving forms with public submission links (no wallet required for respondents)
- **Modular Dashboard:** Extensible widget-based interface for customization
- **Parity DAO Governance:** Participate in on-chain governance for Parity specific refs
- **Smart Dual-Wallet Support:** Intelligent wallet management with account mapping
  - Connect with Substrate wallets (Talisman, SubWallet) or MetaMask, or both simultaneously
  - On-chain account mapping via `pallet_revive` enables Substrate wallets to sign EVM transactions
  - Automatic address resolution (mapped EVM > MetaMask > linked > derived)
  - Single-wallet UX: authenticate with Substrate wallet (on-chain identity) while signing smart contracts

### Status
- **Phase:** MVP
- **Version:** 0.1.0
- **Launch Target:** Q1 2025

---

## 🛠️ Tech Stack

### Core Technologies
- **Framework:** React 18 + TypeScript 5.9
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4.0 (beta)
- **Chain API:** Typink 0.5.0 (dedot-based) + Polkadot.js API 10.12
- **Smart Contracts:** Solidity + Hardhat for Polkadot Hub EVM
- **EVM Integration:** ethers.js 6.13 for contract interaction
- **Light Client:** Smoldot via @substrate/connect

### Polkadot Integration
- **Target Chains:**
  - Polkadot Hub TestNet - RBAC smart contracts, AccessPass NFT minting, account mapping
  - Polkadot Hub (mainnet) - Production RBAC deployment target
  - Polkadot People Chain (mainnet) - Identity verification
- **Wallet Connection:** Typink (Substrate extensions) + MetaMask (EVM) with smart dual-wallet support
- **Account Mapping:** `pallet_revive.map_account()` enables Substrate wallets to sign EVM transactions
- **Authentication:** Wallet-based (permissionless) + on-chain credentials (RBAC)

### Storage Strategy

| Data Type | Solution | Retention |
|-----------|----------|-----------|
| User preferences | LocalStorage | Client-side |
| Access passes | NFTs on Polkadot Hub | Permanent on-chain |
| Identity data | People Chain | Permanent on-chain |
| Location metadata | NFT metadata | Permanent on-chain |

### Additional Libraries
- **UI Components:** Radix UI (Dialog, HoverCard, Popover, Tooltip, Tabs, Select)
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Identicons:** @polkadot/react-identicon
- **Data Fetching:** TanStack React Query 5.90
- **Styling:** class-variance-authority, clsx, tailwind-merge
- **Account Mapping:** @polkadot/api, @polkadot/util-crypto (for Substrate → EVM address derivation)

---

## 📁 Project Structure

```
Intran3t/
├── contracts/                     # Smart contracts
│   ├── solidity/                  # Solidity implementation
│   │   ├── contracts/
│   │   │   ├── Intran3tRBAC.sol      # RBAC smart contract
│   │   │   └── Intran3tAccessPass.sol # AccessPass NFT contract
│   │   ├── scripts/               # Deployment and CLI scripts
│   │   │   ├── check-mapping.js   # Verify account mapping status
│   │   │   ├── grant-admin.js     # Grant admin roles
│   │   │   └── [other scripts]    # Org management, minting, etc.
│   │   ├── test/                  # Contract test suite
│   │   └── hardhat.config.ts      # Hardhat configuration
│   └── README.md                  # Contract documentation
├── src/
│   ├── components/
│   │   ├── ui/                    # Radix UI components
│   │   ├── ConnectWallet.tsx      # Wallet connection UI
│   │   ├── MapAccountModal.tsx    # Account mapping UI flow
│   │   ├── AccountManager.tsx     # Account switching
│   │   ├── LockedModule.tsx       # Access control UI
│   │   ├── SettingsMenu.tsx       # Settings dropdown
│   │   ├── UserProfileModal.tsx   # User profile display
│   │   └── account-info.dedot.tsx # Identity display component
│   ├── contracts/                 # Smart contract integration
│   │   ├── intran3t-rbac.ts       # RBAC ABI, types, and contract address
│   │   └── intran3t-accesspass.ts # AccessPass ABI, types, and contract address
│   ├── providers/                 # React contexts
│   │   └── EVMProvider.tsx        # EVM wallet connection for smart contracts
│   ├── modules/                   # Feature modules
│   │   ├── profile/               # Profile with identity
│   │   │   ├── ProfileWidget.tsx  # Displays RBAC role badges
│   │   │   ├── identity-helpers.ts # Direct People Chain connection
│   │   │   └── use-identity.ts    # Identity React hook
│   │   ├── acc3ss/                # NFT access control with smart dual-wallet
│   │   │   ├── Acc3ssWidget.tsx   # Smart wallet detection & account mapping
│   │   │   └── nft-helpers.ts     # AccessPass NFT operations
│   │   ├── governance/            # Governance participation
│   │   │   └── GovernanceWidget.tsx
│   │   ├── forms/                 # Forms builder
│   │   │   ├── FormsWidget.tsx
│   │   │   ├── PublicForm.tsx
│   │   │   ├── config.ts          # localStorage helpers
│   │   │   ├── types.ts           # TypeScript definitions
│   │   │   └── manifest.json      # Module metadata
│   │   ├── quick-navigation/      # Navigation widget
│   │   └── help-center/           # Help & documentation
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-identity-of.dedot.ts
│   │   ├── use-asset-balance.dedot.ts
│   │   ├── useRBACContract.ts     # RBAC smart contract interaction
│   │   ├── useAccessPassContract.ts # AccessPass NFT contract interaction
│   │   ├── useAccountMapping.ts   # Account mapping check & trigger
│   │   ├── useAccessControl.ts    # Permission checking
│   │   └── useUserSearch.ts       # User search functionality
│   ├── lib/                       # Core utilities
│   │   └── polkadot-provider.dedot.tsx
│   ├── pages/
│   │   ├── Landing.tsx            # Landing page with wallet connect
│   │   ├── ModularDashboard.tsx   # Main dashboard with RBAC
│   │   └── Admin.tsx              # Admin panel with credential issuance
│   └── App.tsx                    # Root component with EVMProvider
├── public/                        # Static assets
├── RBAC_SETUP_GUIDE.md           # RBAC smart contract setup guide
├── RBAC_IMPLEMENTATION_SUMMARY.md # Implementation details
├── QUICK_START_DEPLOYMENT.md     # Quick deployment guide
└── [config files]
```

---

## 🎨 Design System

### Theme
- **Primary Color:** #E6007A (Polkadot Pink)
- **Secondary Color:** #552BBF (Polkadot Purple)
- **Gradient:** Polkadot brand gradient (pink to purple)
- **Background:** Clean neutral grays (#fafafa, #fafaf9)
- **Text:** Stone color palette (#1c1917, #78716c, #a8a29e)

### Typography
- **Headings:** Serif font family for elegance
- **Body:** System font stack for performance
- **Monospace:** For addresses and technical data

### Components
- **UI Library:** Radix UI (headless, accessible)
- **Animations:** Framer Motion for smooth transitions
- **Icons:** Lucide React (consistent, modern icons)

### Design Principles
- Clean, minimal interface focusing on usability
- Responsive design (mobile-first approach)
- Consistent 8px spacing scale
- Polkadot brand colors and gradients

---

## 🔐 Polkadot Architecture

### CRITICAL - Must Follow

**✅ REQUIRED:**
- Light client via smoldot (no RPC endpoints for production)
- Direct blockchain connection using @polkadot/api for reliability
- Support for People Chain (identity) and Polkadot Hub (NFTs + RBAC)
- Multi-network support (testnet + mainnet)

**❌ AVOIDED:**
- Full-node RPC dependencies in production
- Centralized servers for blockchain data
- Single network limitation

### Chain Connections

**Polkadot People Chain (Mainnet)**
- Used for verified on-chain identities
- Displays: name, Matrix, Twitter, GitHub, Discord, email, website
- Shows verification status with green checkmark
- Fallback RPC endpoints for reliability

**Paseo Polkadot Hub (Testnet)**
- RBAC smart contract deployment
- NFT minting for access passes
- Asset transfers and management
- Testing environment for access control

### Identity Integration
- Fetches identity from People Chain using @polkadot/api
- Decodes identity fields (display, social accounts)
- Checks verification status (Reasonable/KnownGood judgements)
- Displays in clean hover card UI
- Supports both legacy (riot) and current (matrix) field names

---

## 🚀 Quick Start

### Prerequisites
```bash
# Requires pnpm
npm install -g pnpm
```

### Installation
```bash
# Clone repository
git clone https://github.com/[your-username]/intran3t.git
cd intran3t

# Install dependencies
pnpm install
```

### Development
```bash
# Start dev server
pnpm dev

# Application runs at http://localhost:5173
```

### Build for Production
```bash
# Build optimized bundle
pnpm build

# Preview production build
pnpm preview
```

---

## 📱 Features

### 1. Profile Module
**On-Chain Identity Integration**
- Connects to Polkadot People Chain for verified identity data
- Displays verified name with green checkmark
- Hover card shows all social accounts:
  - Matrix account (with verification badge)
  - Twitter
  - GitHub
  - Discord
  - Email
  - Website
- Real-time balance display
- Identicon visualization
- Clean, minimal UI

**Implementation:**
- Direct People Chain connection via @polkadot/api
- React Query for caching and state management
- Supports both wallet name and on-chain display name
- Automatic comma/whitespace cleanup

### 2. Acc3ss Module (NFT Access Control)
**Location-Based Access Passes**
- Mint NFT access passes for locations
- Set expiration dates and access levels
- View owned access passes
- Verify access with on-chain NFT ownership
- Admin functions for collection management

**Technical Details:**
- Uses Polkadot Hub NFTs pallet
- Metadata stored on-chain (JSON format)
- Supports multiple locations
- Time-based expiration
- Permission levels (admin, member, visitor)

### 3. RBAC Smart Contracts (Role-Based Access Control)
**Verifiable Credentials on Polkadot Hub EVM**
- Create on-chain organizations
- Issue W3C-compliant Verifiable Credentials
- Role-based permissions (Admin/Member/Viewer/PeopleCulture)
- Granular permission matrix (Action × Resource)
- Credential expiration and revocation support
- Integration with Polkadot wallets via EVM compatibility layer

**Technical Details:**
- Solidity smart contract deployed on Polkadot Hub EVM
- Uses ethers.js for contract interaction
- React hooks for seamless frontend integration
- Supports both testnet (Paseo) and mainnet deployment
- Admin panel UI for credential management
- Profile widget displays user roles as badges

**Permission Matrix:**
| Role | Create Poll | Vote | Create Form | View Results | Manage Users | Settings |
|------|------------|------|-------------|--------------|--------------|----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Member | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| PeopleCulture | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Setup Guide:** See [RBAC_SETUP_GUIDE.md](./RBAC_SETUP_GUIDE.md) for deployment instructions.

### 4. Governance Module
**On-Chain Governance Participation**
- View active referenda
- Participate in voting
- Track governance activity
- Monitor proposal status

### 5. Forms Module
**Privacy-Preserving Form Builder**
- Create custom forms with multiple field types (text, email, textarea, select)
- Generate shareable public links for form submission
- Public form submission without wallet connection required
- Edit forms after creation while preserving responses
- View and manage form submissions in dashboard
- Toggle form status (active/closed)
- Copy shareable links with one click

**Technical Details:**
- localStorage persistence (future Statement Store integration)
- Public route at `/f/:formId` for wallet-free submissions
- Tab-based dashboard widget (Create Form / View Submissions)
- Follows Intran3t design system and modular architecture
- Privacy-preserving approach with data sovereignty messaging

**Key Features:**
- No wallet required for respondents
- Form creator controls access to responses
- Clean, branded public form UI
- Onchain identity CTA for user acquisition
- Seamless integration with existing modules

### 6. Modular Dashboard
**Extensible Widget System**
- Drag-and-drop widget layout (future)
- Customizable module placement
- Responsive grid system
- Clean card-based design

---

## 💻 Common Tasks

### Connect Wallet
1. Navigate to landing page
2. Click "Connect Wallet" button
3. Select your Polkadot wallet extension
4. Approve connection
5. Auto-redirect to dashboard

### View On-Chain Identity
1. Connect wallet with verified identity
2. Identity loads automatically from People Chain
3. Hover over your name to see all social accounts
4. Green checkmark indicates verification

### Mint Access Pass NFT
1. Navigate to Acc3ss module
2. Enter location details
3. Set access level and expiration
4. Sign transaction with wallet
5. NFT minted on Polkadot Hub

### Check Access
1. Enter location ID
2. System queries your NFT ownership
3. Validates expiration and access level
4. Grants/denies access accordingly

### Create and Share a Form
1. Navigate to Forms module in dashboard
2. Click "Create Form" tab
3. Enter form title and description
4. Click "Add Field" to create questions
5. Select field type (text, email, textarea, select)
6. Click "Create Form"
7. Copy shareable link from "View Submissions" tab
8. Share link with respondents (no wallet needed)
9. View responses in "View Submissions" tab

### Edit a Form
1. Navigate to "View Submissions" tab in Forms module
2. Click the edit icon (pencil) on the form you want to modify
3. Make changes to title, description, or fields
4. Click "Update Form" to save changes
5. Existing responses are preserved

---

## 🔧 Technical Implementation

### Identity Fetching
```typescript
// Direct connection to People Chain
import { ApiPromise, WsProvider } from '@polkadot/api'

// Query identity
const api = await getPeopleChainApi()
const identity = await api.query.identity.identityOf(address)

// Decode fields
const displayName = decodeIdentityData(identity.info.display)
const matrix = decodeIdentityData(identity.info.matrix)
const verified = hasPositiveJudgement(identity.judgements)
```

### NFT Access Pass
```typescript
// Mint NFT with metadata
const metadata = {
  location: "Building A",
  locationId: "bldg-a-001",
  holder: userAddress,
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  accessLevel: "member"
}

await mintAccessPassNFT(account, metadata, COLLECTION_ID)
```

### Multi-Network Setup
```typescript
// Configure supported networks
export const SUPPORTED_NETWORKS = [
  paseoAssetHub,    // Testnet for NFTs
  polkadotPeople,   // Mainnet for identities
]
```

---

## 🐛 Common Issues & Solutions

### Identity Not Loading
**Issue:** Identity shows "Loading..." or "No identity found"
**Solution:**
- Ensure wallet is connected
- Verify account has on-chain identity on People Chain
- Check browser console for connection errors
- Multiple RPC fallbacks ensure reliability

### NFT Mint Fails
**Issue:** Transaction fails with "Collection not found"
**Solution:**
- Admin must create collection first using Admin panel
- Verify collection ID matches in config
- Ensure sufficient PAS balance for gas fees

### WebSocket Connection Errors
**Issue:** "Failed to connect to..." messages
**Solution:**
- System tries multiple RPC endpoints automatically
- Usually resolves within 5-10 seconds
- Check internet connection if persistent

---

## 📚 Resources

### Internal Documentation
- Main context is embedded in this README
- Module-specific docs in `src/modules/*/README.md` (if created)

### External Resources
- **Polkadot Wiki:** https://wiki.polkadot.com/
- **Polkadot Docs:** https://docs.polkadot.com/
- **Typink Docs:** https://github.com/open-web3-stack/typink
- **Polkadot.js API:** https://polkadot.js.org/docs/
- **People Chain:** https://wiki.polkadot.network/docs/learn-people-chain

---

## 🎯 Development Roadmap

### Current (v0.1.0)
- ✅ Profile module with on-chain identity
- ✅ Acc3ss module for NFT access control
- ✅ Governance participation
- ✅ Forms module with public submission
- ✅ Multi-wallet support
- ✅ Responsive design

### Planned (v0.2.0)
- [ ] Enhanced governance features
- [ ] Access pass QR codes
- [ ] Location management interface
- [ ] Analytics dashboard
- [ ] Mobile app (PWA)

### Future (v1.0.0)
- [ ] Polkadot App integration (Spektr SDK)
- [ ] PoUD/PoP support
- [ ] Advanced access control rules
- [ ] Multi-signature access
- [ ] Integration with other parachains

---

## 👥 Team & Contacts

### Product Owner
- **Name:** Dennis Schiessl
- **Role:** Product Owner
- **Company:** Parity Technologies

---

## 💻 Coding Conventions

### React Patterns
```typescript
// ✅ Functional components with TypeScript
export function ProfileWidget({ config }: { config: ProfileConfig }) {
  return <div>...</div>
}

// ✅ Custom hooks for logic
export function useIdentity(address: string) {
  return useQuery({
    queryKey: ['identity', address],
    queryFn: () => queryOnChainIdentity(address)
  })
}

// ✅ Contexts for global state
export const PolkadotProvider: React.FC = ({ children }) => {
  return <TypinkProvider>...</TypinkProvider>
}
```

### File Naming
- **Components:** PascalCase (e.g., `ProfileWidget.tsx`)
- **Hooks:** camelCase with 'use' prefix (e.g., `use-identity.ts`)
- **Helpers:** kebab-case (e.g., `identity-helpers.ts`)
- **Types:** PascalCase (e.g., `types.ts`)

### TypeScript Rules
- ✅ Explicit types for function parameters and returns
- ✅ Use `unknown` instead of `any`
- ✅ Interface for objects, Type for unions

### Styling Rules
- ✅ Tailwind utility classes only
- ✅ Consistent spacing (8px scale: 1, 2, 4, 6, 8)
- ✅ Stone color palette for text
- ✅ Polkadot gradients for branding

---

## 📝 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch (future)
- `feature/[name]` - New features
- `fix/[name]` - Bug fixes

### Commit Convention
```bash
# Claude Code generates commits with:
feat(profile): add on-chain identity integration
fix(nft): correct collection ID handling
docs(readme): update installation instructions

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 🚦 Definition of Done

A feature is "done" when:
- [ ] Code written and tested manually
- [ ] Wallet integration tested
- [ ] TypeScript types are correct
- [ ] No console errors or warnings (production)
- [ ] Works on Chrome, Firefox, Safari
- [ ] Mobile responsive
- [ ] Documentation updated

---

## 🎯 Important Constraints

### Performance
- [ ] Initial load < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] Chain sync feedback to user
- [ ] Cached queries for 5 minutes

### Security
- [ ] No private keys in code/logs
- [ ] Validate all user input
- [ ] Handle chain errors gracefully
- [ ] Transaction confirmation UI

### Compatibility
- [ ] Latest Chrome, Firefox, Safari
- [ ] Mobile responsive (iOS/Android)
- [ ] Works with major Polkadot wallets
- [ ] Graceful degradation if identity not found

### Polkadot Platform
- [x] Light client ready (smoldot)
- [x] Multi-network support
- [x] People Chain identity support
- [ ] Ready for Polkadot App integration (future)

---

## 📝 License

MIT License

Copyright (c) 2025 Dennis Schiessl / Parity Technologies

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🙏 Acknowledgments

Built with:
- [Polkadot](https://polkadot.network/) ecosystem
- [Typink](https://github.com/open-web3-stack/typink) by Open Web3 Stack
- [Polkadot.js API](https://polkadot.js.org/) for chain connections
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for blazing fast builds
- [React Query](https://tanstack.com/query) for data fetching
- [Framer Motion](https://www.framer.com/motion/) for animations

Special thanks to the Polkadot and Parity teams for building an incredible ecosystem.

---

**Last Updated:** December 18, 2025
**Status:** Active Development (MVP)
**Version:** 0.1.0
