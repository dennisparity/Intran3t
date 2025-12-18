# Intran3t - Decentralized Access Control & Identity Platform

> **Product Owner:** Dennis Schiessl, Parity Technologies
> **Target Distribution:** Polkadot Triad (Polkadot.com, Mobile App, Desktop)
> **Last Updated:** December 18, 2024

---

## 🎯 Project Overview

### Purpose
Intran3t is a modular dapp demonstrating decentralized access control using NFT-based passes and on-chain identity verification on the Polkadot ecosystem. It showcases integration with People Chain for verified identities and Asset Hub for NFT management.

### Key Features
- **On-Chain Identity:** Real-time identity verification from Polkadot People Chain with social account display (Matrix, Twitter, GitHub, Discord)
- **NFT Access Passes:** Mint, manage, and verify location-based access passes as NFTs on Asset Hub
- **Modular Dashboard:** Extensible widget-based interface for customization
- **Governance Integration:** Participate in on-chain governance directly from the interface
- **Multi-Wallet Support:** Connect with Polkadot.js, Talisman, SubWallet, and more

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
- **Light Client:** Smoldot via @substrate/connect

### Polkadot Integration
- **Target Chains:**
  - Paseo Asset Hub (testnet) - NFT minting and transactions
  - Polkadot People Chain (mainnet) - Identity verification
- **Wallet Connection:** Typink (browser extensions)
- **Authentication:** Wallet-based (permissionless)

### Storage Strategy

| Data Type | Solution | Retention |
|-----------|----------|-----------|
| User preferences | LocalStorage | Client-side |
| Access passes | NFTs on Asset Hub | Permanent on-chain |
| Identity data | People Chain | Permanent on-chain |
| Location metadata | NFT metadata | Permanent on-chain |

### Additional Libraries
- **UI Components:** Radix UI (Dialog, HoverCard, Popover, Tooltip, Tabs, Select)
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Identicons:** @polkadot/react-identicon
- **Data Fetching:** TanStack React Query 5.90
- **Styling:** class-variance-authority, clsx, tailwind-merge

---

## 📁 Project Structure

```
Intran3t/
├── src/
│   ├── components/
│   │   ├── ui/                    # Radix UI components
│   │   ├── ConnectWallet.tsx      # Wallet connection UI
│   │   ├── AccountManager.tsx     # Account switching
│   │   └── account-info.dedot.tsx # Identity display component
│   ├── modules/                   # Feature modules
│   │   ├── profile/               # Profile with identity
│   │   │   ├── ProfileWidget.tsx
│   │   │   ├── identity-helpers.ts # Direct People Chain connection
│   │   │   └── use-identity.ts    # Identity React hook
│   │   ├── acc3ss/                # NFT access control
│   │   │   ├── Acc3ssWidget.tsx
│   │   │   └── nft-helpers.ts     # Asset Hub NFT operations
│   │   ├── governance/            # Governance participation
│   │   │   └── GovernanceWidget.tsx
│   │   ├── quick-navigation/      # Navigation widget
│   │   └── help-center/           # Help & documentation
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-identity-of.dedot.ts
│   │   └── use-asset-balance.dedot.ts
│   ├── lib/                       # Core utilities
│   │   └── polkadot-provider.dedot.tsx
│   ├── pages/
│   │   ├── Landing.tsx            # Landing page with wallet connect
│   │   └── ModularDashboard.tsx   # Main dashboard
│   └── App.tsx                    # Root component
├── public/                        # Static assets
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
- Support for People Chain (identity) and Asset Hub (NFTs)
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

**Paseo Asset Hub (Testnet)**
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
- Uses Asset Hub NFTs pallet
- Metadata stored on-chain (JSON format)
- Supports multiple locations
- Time-based expiration
- Permission levels (admin, member, visitor)

### 3. Governance Module
**On-Chain Governance Participation**
- View active referenda
- Participate in voting
- Track governance activity
- Monitor proposal status

### 4. Modular Dashboard
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
5. NFT minted on Asset Hub

### Check Access
1. Enter location ID
2. System queries your NFT ownership
3. Validates expiration and access level
4. Grants/denies access accordingly

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

Copyright (c) 2024 Dennis Schiessl / Parity Technologies

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

**Last Updated:** December 18, 2024
**Status:** Active Development (MVP)
**Version:** 0.1.0
