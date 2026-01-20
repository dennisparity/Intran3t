# Intran3t - Operational Context

> Last updated: 2026-01-20
> Architecture overview: See [README.md](./README.md)

## Recent Changes

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
| `VITE_ASSETHUB_EVM_CHAIN_ID` | Asset Hub EVM chain ID | `420420417` | Yes |
| `VITE_ASSETHUB_EVM_RPC` | Asset Hub EVM RPC endpoint | `https://services.polkadothub-rpc.com/testnet` | Yes |
| `VITE_PEOPLE_CHAIN_RPC` | People Chain WebSocket RPC | `wss://polkadot-people-rpc.polkadot.io` | Yes |
| `VITE_DOTID_API_URL` | dotid.app proxy endpoint | `/api/dotid-proxy` | Yes |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` | No |
| `VITE_ENABLE_DEBUG_LOGS` | Enable debug logging | `true` | No |

> **Updated Jan 20, 2026:** Contract redeployed to Polkadot Hub TestNet.
> - New contract: `0xF1152B54404F7F4B646199072Fd3819D097c4F94`
> - New RPC: `https://services.polkadothub-rpc.com/testnet`
> - New chain ID: `420420417`

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
```bash
./deploy.sh          # Interactive deployment script (preview or production)
vercel               # Deploy to preview environment (generates unique URL)
vercel --prod        # Deploy to production domain
vercel login         # Authenticate with Vercel (first time only)
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

### Polkadot Hub TestNet (Updated Jan 20, 2026)
- **Network**: Polkadot Hub TestNet
- **EVM RPC**: `https://services.polkadothub-rpc.com/testnet`
- **Chain ID**: `420420417` (decimal) / `0x1909B741` (hex)
- **Currency**: PAS
- **Block Explorer**: https://polkadot.testnet.routescan.io/
- **Faucet**: https://faucet.polkadot.io/
- **Purpose**: RBAC smart contract deployment and transactions
- **Contract**: `0xF1152B54404F7F4B646199072Fd3819D097c4F94` (deployed Jan 20, 2026)
- **Deployer**: `0x7E59585d3bc72532EE7D1ceaE9BE732E6edCeb62`
- **Block**: 4537801

### People Chain
- **RPC**: `wss://polkadot-people-rpc.polkadot.io`
- **Purpose**: Identity verification and registry
- **Integration**: Read-only via dotid.app API

## Known Issues & Workarounds

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
- [ ] Connect wallet (ensure Asset Hub network is added)
- [ ] Create or access an organization
- [ ] Test Dashboard search:
  - [ ] Search for existing team members
  - [ ] Search for People Chain identities (should show "Registry" badge)
  - [ ] Verify Matrix handles display in purple
- [ ] Test Admin panel:
  - [ ] Switch between "Registry Browser" and "Address Search" modes
  - [ ] Search registry by name
  - [ ] Add team member from registry
  - [ ] Add team member by address
- [ ] Test role assignment
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

## Deployment Workflow

### Staging → Production Flow

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
