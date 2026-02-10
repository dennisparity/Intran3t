# Intran3t - Operational Context

> Last updated: 2026-02-10
> Architecture overview: See [README.md](./README.md)

## Recent Changes

### 2026-02-10 - DotNS Contenthash Encoding Fix (CRITICAL)
- **Fix**: Corrected IPFS contenthash encoding in `scripts/deploy.js` to comply with ENSIP-7 standard
- **Issue**: Gateway returned HTTP 422 "Unsupported contenthash" due to missing IPFS version byte
- **Root Cause**: Contenthash was encoded as `0xe3 + CID bytes` (37 bytes) instead of `0xe3 + 0x01 + CID bytes` (38 bytes)
- **Format**: ENSIP-7 requires: `0xe3` (IPFS namespace) + `0x01` (IPFS version) + CID bytes
- **Impact**: All deployments prior to this fix would fail at gateway resolution despite successful on-chain registration
- **Investigation**: Cross-referenced `polkadot-bulletin-chain` and `product-infrastructure` repositories
- **Discovery**: `product-infrastructure` had two conflicting implementations:
  - `src/bulletin/cid.ts` → ✅ Correct (with 0x01 version byte)
  - `src/commands/content-hash.ts` → ❌ Incorrect (missing version byte)
  - dotns-cli was using the incorrect version
- **Fix Applied**: Updated `encodeContenthash()` function in `scripts/deploy.js` to add IPFS version byte
- **Verification**: Domain `intran3t-app42.dot` now resolves correctly at https://intran3t-app42.paseo.li
- **Transaction**: Corrected contenthash tx `0xaa34f10740b333d4eeec4deab34be78ee80a931dc83e90b324660feac5d895d4`
- **Reference**: See GitHub issue for detailed technical analysis

### 2026-02-07 - DotNS Decentralized Web Hosting Deployment
- **Feature**: Complete DotNS + Bulletin deployment pipeline for decentralized hosting
- **Deployment**: Successfully deployed to `intran3t-app42.dot` on Polkadot testnet
- **Live URL**: https://intran3t-app42.paseo.li
- **Scripts**: Added complete deployment infrastructure:
  - `scripts/deploy.js` - Bulletin storage with chunking and DAG-PB
  - `scripts/dotns.js` - DotNS domain registration and contenthash management
  - `scripts/deploy-nextjs.js` - Next.js build deployment wrapper
- **Dependencies**: Added IPFS/IPLD libraries (@ipld/car, @ipld/dag-pb, ipfs-unixfs, multiformats)
- **Configuration**: Updated `.env.example` with DotNS deployment variables
- **PAPI Integration**: Added `.papi/` directory with Paseo Asset Hub and Bulletin chain descriptors
- **Key Insights**:
  - RPC endpoint must be `wss://sys.ibp.network/asset-hub-paseo` (not testnet-passet-hub.polkadot.io)
  - Contract addresses are different per RPC endpoint
  - Use `NODE_OPTIONS="--max-old-space-size=8192"` to prevent heap errors
  - Domain registration succeeded but ownership verification requires dotns-cli tool
  - Working gateway: `paseo.li` (bigtava.online not functional)
- **External Repository**: Cloned `paritytech/product-infrastructure` for reference implementations
- **Tools**: Installed Bun runtime for dotns-cli usage
- **Transaction**: Registration tx `0xf7332036e93d340c632676ae3842e7ad4f6fde8293ebd2fa1f4708037ce7ef2c`
- **Transaction**: Contenthash tx `0x20c5e634131732c64e1fc8a66f4700b30b99e20c2f3916c920ee5fd00aaa553f`

## Recent Changes

### 2026-02-06 - Smart Dual-Wallet Architecture with Account Mapping
- **Feature**: Substrate wallet account mapping via `pallet_revive.map_account()`
- **Feature**: Smart dual-wallet support — works with Substrate-only, MetaMask-only, or both
- **File**: `src/hooks/useAccountMapping.ts` — Hook to check/trigger on-chain account mapping
- **File**: `src/components/MapAccountModal.tsx` — UI flow for mapping Substrate accounts to EVM addresses
- **File**: `src/modules/acc3ss/Acc3ssWidget.tsx` — Integrated account mapping into access pass minting flow
- **File**: `contracts/solidity/scripts/check-mapping.js` — CLI script to verify account mapping status
- **File**: `.env` — Updated RPC URL to `https://eth-rpc-testnet.polkadot.io` (official endpoint)
- **Dependencies**: Added `@polkadot/api` and `@polkadot/util-crypto` to contracts/solidity
- **Documentation**: Added account mapping reference to polkadot-smart-contracts skill
- **UX**: Three connection modes:
  1. Substrate-only (mapped) → Single wallet UX with mapped EVM address
  2. Substrate-only (not mapped) → "Map Account" prompt
  3. MetaMask-only → Standard EVM flow
  4. Both wallets (Substrate mapped) → Prefers mapped address
  5. Both wallets (Substrate not mapped) → Uses MetaMask, shows optional mapping tip
- **Priority**: `mapped EVM address > MetaMask > linked address > derived address`
- **Benefits**: Users can authenticate with Substrate wallet (on-chain identity) while signing EVM transactions (smart contracts)

### 2026-02-05 - Landing Page Redesign

### 2026-02-05 - Landing Page Redesign
- **UI**: Redesigned `src/pages/Landing.tsx` to match the polkadot-payroll landing layout
- **Header**: Stacked logo layout (Polkadot icon + name + "from Polkadot"), added `border-b`
- **Hero**: Tagline heading ("Your workplace, on Polkadot."), dual CTA buttons ("Get Started →" + outlined "Learn More"), scroll indicator with animated chevron
- **Features**: Added "Why Intran3t?" section — 3-column grid (Plugin Architecture, Identity-First, On-Chain Storage) with Polkadot icon tiles and staggered scroll-in animations
- **CTA + Footer**: Added bottom CTA section and proper bordered footer
- **Imports**: Added `ArrowRight`, `ChevronDown` from `lucide-react`

### 2026-01-28 - dForms Statement Store Integration
- **Feature**: Wallet-less form submissions with auto-generated wallets
- **Feature**: On-chain form storage using Polkadot statement store
- **File**: `src/lib/wallet.ts` - BIP39 wallet generation and derivation (from web3-meet)
- **File**: `src/lib/storage.ts` - Browser cookie wallet storage (from web3-meet)
- **File**: `src/lib/ss-webrtc/StatementStore.ts` - Statement store blockchain client (from web3-meet)
- **File**: `src/lib/ss-webrtc/types.ts` - Form channel type definitions (adapted from web3-meet)
- **File**: `src/lib/forms-statement-store.ts` - Forms-specific statement store service
- **File**: `src/modules/forms/PublicForm.tsx` - Auto-wallet creation and statement store submission
- **File**: `src/modules/forms/FormsWidget.tsx` - Statement store form publishing
- **File**: `package.json` - Added @polkadot-api/* and wallet dependencies
- **File**: `.env` - Added `VITE_SUBSTRATE_ENDPOINT=wss://pop-testnet.parity-lab.parity.io:443/9910`
- **File**: `.env.example` - Added statement store configuration section
- **File**: `DFORMS_STATEMENT_STORE_UPDATE.md` - Complete documentation of changes
- **Privacy**: 2-week auto-delete for responses (ephemeral storage)
- **UX**: Info banner: "Your wallet will be created automatically and stored securely in your browser"
- **Source**: Based on web3-meet repository (https://github.com/Nemanya8/web3-meet)

### 2026-01-20 - Polkadot Hub TestNet Migration & UI Improvements
- **Migration**: Moved from deprecated Paseo testnet to new Polkadot Hub TestNet
- **Contract**: Redeployed RBAC contract to `0xF1152B54404F7F4B646199072Fd3819D097c4F94`
- **File**: `contracts/solidity/hardhat.config.js` - Updated network config (chain ID: 420420417)
- **File**: `contracts/solidity/deployments/polkadotHubTestnet.json` - New deployment record
- **File**: `.env` - Updated RPC endpoint and contract address
- **File**: `.env.example` - Rewritten with complete Intran3t configuration
- **File**: `contracts/README.md` - Updated RPC endpoints documentation
- **UI**: Various component styling improvements (Button, Card, Dialog, Input)
- **UI**: Enhanced form styling and module widget appearances
- **Network**: New RPC: `https://services.polkadothub-rpc.com/testnet`
- **Network**: New chain ID: `420420417` (was `421006`)

### 2026-01-13 - People Chain Registry Integration & Vercel Deployment
- **File**: `src/services/dotid-registry.ts` - New API client for People Chain identity registry
- **File**: `src/hooks/useUserSearch.ts` - Added parallel registry search
- **File**: `src/components/UserSearchResults.tsx` - Added "Registry" badge for People Chain identities
- **File**: `src/pages/Admin.tsx` - Enhanced with dual-mode UI (registry browser + address search)
- **File**: `api/dotid-proxy.js` - Vercel serverless function for CORS proxy
- **File**: `vite.config.mjs` - Added dev proxy for dotid.app
- **File**: `deploy.sh` - Automated Vercel deployment script
- **Added**: Environment variable `VITE_DOTID_API_URL`
- **Fixed**: CORS issues with dotid.app API
- **Fixed**: Package manager conflicts (migrated to npm only)
- **Fixed**: Vercel build error (`.vercelignore` was excluding source files)

## Key Files & Components

### useAccountMapping Hook
- **File**: `src/hooks/useAccountMapping.ts`
- **Purpose**: Check and trigger on-chain account mapping for Substrate → EVM address
- **Key functions**:
  - Derives fallback EVM address via `keccak256(AccountId32)` → last 20 bytes
  - Queries `pallet_revive.OriginalAccount(evmAddress)` to check mapping status
  - `mapAccount()` - Triggers `pallet_revive.map_account()` transaction
- **Returns**: `{ isMapped, evmAddress, isLoading, mapAccount }`
- **Used by**: Acc3ssWidget (smart contract interactions)
- **Notes**: Enables single-wallet UX (Substrate wallet signs EVM transactions after mapping)

### MapAccountModal Component
- **File**: `src/components/MapAccountModal.tsx`
- **Purpose**: UI flow for mapping Substrate accounts to EVM addresses
- **Flow**: Info → Signing → Success → Error (with retry)
- **Props**: `{ evmAddress, onClose, onSuccess, onMap }`
- **Features**:
  - Shows derived EVM address to user
  - Handles transaction signing via Typink
  - Auto-closes on success with 2-second delay
- **Used by**: Acc3ssWidget

### Acc3ssWidget (Smart Contract Minting)
- **File**: `src/modules/acc3ss/Acc3ssWidget.tsx`
- **Purpose**: Mint ERC-721 access passes via AccessPass smart contract
- **Smart Wallet Logic**:
  - Detects connection mode (Substrate-only, MetaMask-only, or both)
  - Address priority: `mapped EVM > MetaMask > linked > derived`
  - Substrate-only + not mapped → Shows "Map Account" prompt
  - Substrate-only + mapped → Single wallet UX (uses mapped address)
  - MetaMask-only → Standard EVM flow
  - Both wallets → Prefers mapped address if available, else uses MetaMask
- **Features**:
  - RBAC membership gate (Admin or Member required)
  - VirtualDoor animation on successful mint
  - QR code generation for access passes
- **Dependencies**: `useAccountMapping`, `useRBACContract`, `useAccessPassContract`

### dotid-registry Service
- **File**: `src/services/dotid-registry.ts`
- **Purpose**: Fetch and search verified identities from People Chain via dotid.app API
- **Key functions**:
  - `fetchRegistryIdentities()` - Fetch all identities with 5-minute client-side cache
  - `searchRegistryByName(query)` - Search by display name, legal name, Twitter, Matrix
  - `isVerified(identity)` - Check if identity has judgements
- **Used by**: `useUserSearch` hook, Admin panel
- **Notes**: Uses conditional API URL (`/api/dotid` in dev, `/api/dotid-proxy` in prod)

### useUserSearch Hook
- **File**: `src/hooks/useUserSearch.ts`
- **Purpose**: Combines local user search with People Chain registry search in parallel
- **Key functions**: `useUserSearch(query)` - Returns combined results from local + registry
- **Used by**: Dashboard search bar, Admin panel
- **Notes**: Limits registry results to top 5, marks source as 'registry'

### UserSearchResults Component
- **File**: `src/components/UserSearchResults.tsx`
- **Purpose**: Display search results with source badges
- **Features**: Purple "Registry" badge for People Chain identities
- **Used by**: Dashboard, Admin panel

### Admin Panel
- **File**: `src/pages/Admin.tsx`
- **Purpose**: Team management with registry integration
- **Features**: Dual-mode UI (Registry Browser / Address Search)
- **Notes**: Registry browser shows Matrix handles in purple, live search filtering

### Vercel Serverless Function
- **File**: `api/dotid-proxy.js`
- **Purpose**: CORS proxy for dotid.app API
- **Endpoint**: `/api/dotid-proxy`
- **Caching**: Sets `s-maxage=300` for 5-minute server cache
- **Notes**: Required because we don't control CORS headers on dotid.app

## Environment Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `VITE_NETWORK` | Network to use (testnet/mainnet) | `testnet` | Yes |
| `VITE_RBAC_CONTRACT_ADDRESS` | RBAC smart contract address | `0xF1152B54404F7F4B646199072Fd3819D097c4F94` | Yes |
| `VITE_ACCESSPASS_CONTRACT_ADDRESS` | AccessPass NFT contract address | `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` | Yes |
| `VITE_ASSETHUB_EVM_CHAIN_ID` | Asset Hub EVM chain ID | `420420417` | Yes |
| `VITE_ASSETHUB_EVM_RPC` | Asset Hub EVM RPC endpoint | `https://eth-rpc-testnet.polkadot.io` | Yes |
| `VITE_PEOPLE_CHAIN_RPC` | People Chain WebSocket RPC | `wss://polkadot-people-rpc.polkadot.io` | Yes |
| `VITE_DOTID_API_URL` | dotid.app proxy endpoint | `/api/dotid-proxy` | Yes |
| `VITE_SUBSTRATE_ENDPOINT` | Statement Store endpoint (dForms) | `wss://pop-testnet.parity-lab.parity.io:443/9910` | Yes |
| `VITE_DEFAULT_ORG_ID` | Default organization ID | `0xda0dfc1c...` | Yes |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` | No |
| `VITE_ENABLE_DEBUG_LOGS` | Enable debug logging | `true` | No |

> **Updated Feb 6, 2026:** RPC endpoint changed to official URL.
> - RBAC contract: `0xF1152B54404F7F4B646199072Fd3819D097c4F94`
> - AccessPass contract: `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94`
> - RPC: `https://eth-rpc-testnet.polkadot.io` (updated from services.polkadothub-rpc.com)
> - Chain ID: `420420417`

**Configuration Files:**
- `.env` - Local development (gitignored)
- `.env.production` - Production deployment template (committed for reference)
- `.npmrc` - npm configuration (`legacy-peer-deps=true` for compatibility)

## Commands & Scripts

### Development
```bash
npm run dev          # Start Vite dev server on localhost:5173
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

### Deployment

**Vercel (Traditional):**
```bash
./deploy.sh          # Interactive deployment script (preview or production)
vercel               # Deploy to preview environment (generates unique URL)
vercel --prod        # Deploy to production domain
vercel login         # Authenticate with Vercel (first time only)
```

**DotNS (Decentralized - Polkadot):**
```bash
# Full deployment (build + storage + registration)
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:dotns

# Deploy with existing CID (skip storage)
IPFS_CID="bafk..." NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:dotns

# Set contenthash only (using dotns-cli)
cd ~/product-infrastructure/examples/pop-dotns
bun run dev content set <domain-name> <cid> --mnemonic "<your-mnemonic>"

# Transfer domain ownership
bun run dev transfer <domain-name> <new-owner-address> --mnemonic "<current-owner-mnemonic>"
```

**CRITICAL:** Use `wss://sys.ibp.network/asset-hub-paseo` RPC endpoint for DotNS deployments.

### Smart Contract Scripts (contracts/solidity/scripts/)
```bash
# Account Mapping
node scripts/check-mapping.js <substrate-address>     # Check if account is mapped to EVM

# Organization Management
node scripts/find-my-orgs.js                          # Find orgs where you're an admin
node scripts/create-org-simple.js                     # Create a new organization
node scripts/check-org-details.js <org-id>            # View org details

# Role Management
node scripts/grant-admin.js <evm-address>             # Grant Admin role
node scripts/setup-complete.js                        # Complete org setup (create + grant admin)

# AccessPass NFT
node scripts/mint-pass.js                             # Mint an access pass NFT
node scripts/check-contract.js                        # Verify contract deployment
```

### Vercel CLI Commands
```bash
vercel curl / --deployment <URL>                    # Access deployed site with auth bypass
vercel inspect <URL> --logs                        # View deployment logs
vercel redeploy <URL>                              # Redeploy a specific deployment
vercel env add VITE_VAR_NAME production            # Add environment variable to Vercel
```

## External Services & APIs

### People Chain Registry (dotid.app)
- **API**: `https://dotid.app/api/directory/identities`
- **Purpose**: Query verified Polkadot identities from People Chain
- **Proxy**: `/api/dotid-proxy` (Vercel serverless function handles CORS)
- **Development**: Vite proxy at `/api/dotid` → `https://dotid.app/api/directory`
- **Production**: Serverless function at `api/dotid-proxy.js`
- **Caching**:
  - Client-side: 5-minute cache in `dotid-registry.ts`
  - Server-side: `s-maxage=300` in serverless function
- **Response**: Array of identity objects with fields: `address`, `display`, `legal`, `twitter`, `matrix`, `judgements`, etc.
- **Used by**: Dashboard search, Admin registry browser

### Polkadot Hub TestNet (Updated Feb 6, 2026)
- **Network**: Polkadot Hub TestNet
- **EVM RPC**: `https://eth-rpc-testnet.polkadot.io` (updated from services.polkadothub-rpc.com)
- **Substrate RPC**: `wss://polkadot-testnet-rpc.polkadot.io` (for account mapping via pallet_revive)
- **Chain ID**: `420420417` (decimal) / `0x1909B741` (hex)
- **Currency**: PAS
- **Block Explorer**: https://polkadot.testnet.routescan.io/
- **Faucet**: https://faucet.polkadot.io/
- **Purpose**: RBAC + AccessPass smart contracts, account mapping
- **Contracts**:
  - RBAC: `0xF1152B54404F7F4B646199072Fd3819D097c4F94` (deployed Jan 20, 2026)
  - AccessPass: `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` (deployed Jan 23, 2026)
- **Deployer**: `0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62`
- **Account Mapping**: Use `pallet_revive.map_account()` to enable Substrate wallets to sign EVM transactions

### People Chain
- **RPC**: `wss://polkadot-people-rpc.polkadot.io`
- **Purpose**: Identity verification and registry
- **Integration**: Read-only via dotid.app API

## Known Issues & Workarounds

### DotNS Gateway 422 - Incorrect Contenthash Encoding
**Problem**: Gateway returned HTTP 422 "Unsupported contenthash" even though domain was registered and content existed on Bulletin
**Root Cause**: IPFS contenthash was missing the required IPFS version byte per ENSIP-7 standard
- Incorrect: `0xe3 + CID bytes` (37 bytes)
- Correct: `0xe3 + 0x01 + CID bytes` (38 bytes)
**Workaround**: Updated `scripts/deploy.js` `encodeContenthash()` function to include version byte
**Status**: Fixed (2026-02-10)
**Reference**:
- ENSIP-7: https://docs.ens.domains/ens-improvement-proposals/ensip-7-contenthash-field
- Fixed in commit with contenthash encoding update

### CORS with dotid.app API
**Problem**: Browser CORS policy blocks direct calls to `https://dotid.app/api/directory/identities`
**Workaround**:
- Development: Vite proxy in `vite.config.mjs` (`/api/dotid` → `https://dotid.app/api/directory`)
- Production: Vercel serverless function at `api/dotid-proxy.js` with CORS headers
**Status**: Fixed

### Package Manager Conflicts
**Problem**: Project had both `yarn.lock` and `pnpm-lock.yaml`, causing Vercel to use wrong package manager
**Workaround**:
- Removed `yarn.lock` and `pnpm-lock.yaml` (moved to `*.bak`)
- Migrated to npm exclusively
- Added `.npmrc` with `legacy-peer-deps=true`
- Added `*.bak` to `.gitignore`
**Status**: Fixed

### Vercel Build - Source Files Not Found
**Problem**: Vite build failed with "Failed to resolve /src/main.tsx" during Vercel deployment
**Workaround**: Removed `src` and `public` from `.vercelignore` - Vercel needs source files to build the app
**Status**: Fixed

## Testing Procedures

### Manual Testing Checklist - Preview Deployment
- [ ] Visit preview URL (provided by Vercel after `vercel` command)
- [ ] Connect wallet (ensure Polkadot Hub TestNet is added to MetaMask)
- [ ] Test account mapping (Substrate wallet only):
  - [ ] Connect Talisman/SubWallet (Substrate mode)
  - [ ] Verify "Map Account" prompt appears
  - [ ] Map account via modal
  - [ ] Verify mapping succeeded (check console logs)
- [ ] Test dual-wallet modes:
  - [ ] Substrate-only (mapped) → Single wallet UX
  - [ ] MetaMask-only → Standard EVM flow
  - [ ] Both wallets → Prefers mapped address
- [ ] Test Dashboard search:
  - [ ] Search for existing team members
  - [ ] Search for People Chain identities (should show "Registry" badge)
  - [ ] Verify Matrix handles display in purple
- [ ] Test Admin panel:
  - [ ] Switch between "Registry Browser" and "Address Search" modes
  - [ ] Search registry by name
  - [ ] Add team member from registry
  - [ ] Add team member by address
- [ ] Test Acc3ss module:
  - [ ] Select location
  - [ ] Verify RBAC membership check (Admin/Member required)
  - [ ] Mint access pass
  - [ ] Verify VirtualDoor animation plays
  - [ ] View pass in NFT modal
- [ ] Verify transactions execute successfully

### Feature Testing - People Chain Registry Search

**How to test**:
1. Navigate to Dashboard
2. Type a name in the search bar (e.g., "Shawn", "Jaco", "kianenigma")
3. Verify results show purple "Registry" badge for People Chain identities
4. Check that Matrix handles appear in purple

**Expected behavior**:
- Local users appear without badge
- Registry users have purple "Registry" badge
- Search is case-insensitive
- Results appear within 1-2 seconds (cached after first fetch)
- Search matches: display name, legal name, Twitter handle, Matrix handle

### Feature Testing - Admin Registry Browser

**How to test**:
1. Go to Admin → Users
2. Click "Search People Chain"
3. Toggle between "Registry Browser" and "Address Search"
4. Type a name to filter registry (live search)
5. Click "Add to Team" on a registry entry

**Expected behavior**:
- Registry loads within 1-2 seconds
- Search filters in real-time (client-side)
- Displays: name, address (truncated), Matrix handle, Twitter
- Can add users to organization from registry
- Added users get default "Member" role

### Feature Testing - Account Mapping & Dual-Wallet Support

**How to test (Substrate-only)**:
1. Connect Talisman or SubWallet (Substrate mode)
2. Navigate to Acc3ss module
3. Verify "Map Account" prompt appears
4. Click "Map Account" → review derived EVM address → sign transaction
5. Wait for confirmation (~12 seconds)
6. Verify UI updates to show mint button

**How to test (MetaMask-only)**:
1. Connect MetaMask (ensure chain ID 420420417)
2. Navigate to Acc3ss module
3. Should skip mapping check, show mint button directly (if member)

**How to test (Both wallets)**:
1. Connect both Talisman (Substrate) and MetaMask
2. If Substrate not mapped: Uses MetaMask, shows optional mapping tip
3. If Substrate is mapped: Prefers mapped address, ignores MetaMask

**Expected behavior**:
- Console shows: `🗺️ Account mapping check: { isMapped: true/false }`
- Substrate-only + not mapped → Blue "Map Account" card
- Substrate-only + mapped → Mint button (uses mapped address)
- MetaMask-only → Mint button (uses MetaMask)
- Both + Substrate mapped → Mint button (prefers mapped)
- Both + Substrate not mapped → Mint button + mapping tip (uses MetaMask)

**Verify account mapping**:
```bash
cd contracts/solidity
node scripts/check-mapping.js <substrate-address>
```

## DotNS Decentralized Deployment

### Architecture

Two chains, two jobs:

| Chain | Role | RPC Endpoint |
|-------|------|--------------|
| **Bulletin** | Content storage | `wss://bulletin.dotspark.app` |
| **Paseo Asset Hub** | DotNS contracts | `wss://sys.ibp.network/asset-hub-paseo` |

### Contract Addresses (Paseo Asset Hub)

**CRITICAL:** These addresses are specific to `wss://sys.ibp.network/asset-hub-paseo`

```javascript
{
  DOTNS_REGISTRAR: "0x329aAA5b6bEa94E750b2dacBa74Bf41291E6c2BD",
  DOTNS_REGISTRAR_CONTROLLER: "0xd09e0F1c1E6CE8Cf40df929ef4FC778629573651",
  DOTNS_REGISTRY: "0x4Da0d37aBe96C06ab19963F31ca2DC0412057a6f",
  DOTNS_RESOLVER: "0x95645C7fD0fF38790647FE13F87Eb11c1DCc8514",
  DOTNS_CONTENT_RESOLVER: "0x7756DF72CBc7f062e7403cD59e45fBc78bed1cD7",
  STORE_FACTORY: "0x030296782F4d3046B080BcB017f01837561D9702",
  POP_ORACLE: "0x4e8920B1E69d0cEA9b23CBFC87A17Ee6fE02d2d3",
}
```

### Key Scripts

- **`scripts/deploy.js`** - Core deployment logic (Bulletin storage, CID generation, DAG-PB)
- **`scripts/dotns.js`** - DotNS client (registration, contenthash management, ReviveClientWrapper)
- **`scripts/deploy-nextjs.js`** - Next.js deployment wrapper
- **`.papi/`** - PAPI descriptors for Paseo Asset Hub and Bulletin chains

### Environment Variables

Add to `.env`:

```bash
DOTNS_MNEMONIC="your twelve word mnemonic here"
DOTNS_DOMAIN=intran3t-app42
BULLETIN_RPC=wss://bulletin.dotspark.app
PASEO_ASSETHUB_RPC=wss://sys.ibp.network/asset-hub-paseo
```

### Domain Naming Rules

- **8+ characters** total
- **Exactly 2 trailing digits** (e.g., `intran3t-app42`, `my-site99`)
- Lowercase letters, digits, hyphens only
- No leading/trailing hyphens

### Deployment Flow

1. **Build:** `npm run build` (creates `dist/`)
2. **Merkleize:** IPFS CLI creates CAR file from directory
3. **Store on Bulletin:** Chunked upload (1.5MB chunks) with DAG-PB root
4. **Register Domain:** Commit-reveal on Paseo Asset Hub
5. **Set Contenthash:** Links domain to Bulletin CID
6. **Gateway Resolution:** `<domain>.paseo.li` fetches from Bulletin

### Current Deployment

- **Domain:** `intran3t-app42.dot`
- **Owner:** `0x35Cdb23fF7fc86E8DCcd577CA309bFEA9c978D20` (DEV_PHRASE - transfer pending)
- **CID:** `bafybeibm6rfptryqpmfvffd65qsw5xkuj2l3wwjodtj5ksjkff3hxf7rcy`
- **Live URL:** https://intran3t-app42.paseo.li
- **Registration Tx:** `0xf7332036e93d340c632676ae3842e7ad4f6fde8293ebd2fa1f4708037ce7ef2c`
- **Contenthash Tx:** `0x20c5e634131732c64e1fc8a66f4700b30b99e20c2f3916c920ee5fd00aaa553f`

### Known Issues

1. **Gateway:** Only `paseo.li` works; `bigtava.online` returns errors
2. **RPC Endpoints:** Contract addresses are **different** per RPC endpoint - always use `wss://sys.ibp.network/asset-hub-paseo`
3. **Memory:** Use `NODE_OPTIONS="--max-old-space-size=8192"` to prevent heap errors with large chain responses
4. **Ownership Verification:** Built-in verification fails; use dotns-cli tool for post-deployment operations
5. **Reference Repo Required:** Need `paritytech/product-infrastructure` cloned locally for dotns-cli

### External Tools

**dotns-cli** (from product-infrastructure repo):
```bash
# Clone reference repository
git clone git@github.com:paritytech/product-infrastructure.git ~/product-infrastructure

# Setup
cd ~/product-infrastructure/examples/pop-dotns
bun install
bun papi

# Set contenthash
bun run dev content set <domain> <cid> --mnemonic "<mnemonic>"

# Transfer ownership
bun run dev transfer <domain> <new-owner> --mnemonic "<current-owner-mnemonic>"

# View domain info
bun run dev lookup name <domain>
```

## Deployment Workflow

### Vercel: Staging → Production Flow

1. **Development**: Make changes, test locally with `npm run dev`
2. **Preview Deployment**: Deploy to staging
   ```bash
   vercel
   ```
   - Generates unique preview URL (e.g., `https://intran3t-dhqnnkaht-<project>.vercel.app`)
   - Safe to iterate and test
   - Shareable for feedback
3. **Testing**: Complete manual testing checklist on preview URL
4. **Production**: Deploy to production
   ```bash
   vercel --prod
   ```
   - Pushes to main domain (`intran3t.vercel.app`)
   - Use only after preview testing passes

### Git Workflow
```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push origin main

# Deploy to preview for testing
vercel

# After testing passes, deploy to production
vercel --prod
```

## Development Notes

### Important Patterns

- **Parallel Search**: Registry search runs in parallel with local search for better UX (both promises resolve independently)
- **Client-side Caching**: Registry data cached 5 minutes to reduce API load and improve performance
- **Conditional API URLs**: Use `import.meta.env.DEV` to switch between dev proxy and production serverless function
- **Source Badge System**: Use color-coded badges to distinguish data sources (purple "Registry" for People Chain, other colors for local data)

### Code Style

- React components use TypeScript with strict mode
- API services export typed functions
- Use `lucide-react` for icons
- Tailwind CSS for styling with custom color palette
- Radix UI for accessible components
- File naming: PascalCase for components, kebab-case for services/helpers

### Architecture Decisions

- **npm over pnpm/yarn**: Migrated to npm for simpler Vercel builds and fewer compatibility issues
- **Serverless CORS Proxy**: Better than CORS headers since we don't control dotid.app
- **Dual-mode Admin UI**: Offers both registry browsing and direct address lookup for flexibility
- **Read-only Registry Integration**: dotid.app integration is read-only; write operations go through People Chain directly

## Resources

- [README.md](./README.md) - Architecture, features, and setup instructions
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Hosting Options](./HOSTING_OPTIONS.md) - Comparison of hosting platforms
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md) - Quick Vercel reference
- [dotid.app](https://dotid.app/) - People Chain identity registry
- [Vercel Documentation](https://vercel.com/docs) - Deployment platform docs
