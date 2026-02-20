# Intran3t - Operational Context

> Last updated: 2026-02-20
> Architecture overview: See [README.md](./README.md)

## Recent Changes

### 2026-02-20 - dForms UI/UX Improvements (Polkadot Branding)

**Status:** ✅ Complete - Production ready

**Summary:** Complete redesign of forms UI to match Polkadot brand guidelines with enhanced data visualization and improved user experience.

#### Form Creation Module (FormsWidget.tsx)
- Enhanced button visibility with Polkadot brand styling (px-8 py-4, shadow-md hover:shadow-lg)
- Added markdown formatting support to description field (**bold**, *italic*, [links](url))
- Improved "Add Field" button with dark background (#1c1917)
- Better visual hierarchy and spacing

#### Form Links
- **Shortened form URLs** from `/#/f/{formId}?key={base64}&def={base64}` to `/#/f/{formId}#key={base64}`
- Removed form definition from URL (now loaded from Bulletin chain)
- Cleaner, more shareable links

#### Public Form View (PublicForm.tsx)
- Replaced `/logo.png` with PolkadotLogo component throughout
- Applied landing page hero styling (larger headings, better spacing)
- **CRITICAL FIX:** Now waits for Bulletin upload before showing success confirmation
- Added loading state: "Encrypting & uploading to Polkadot..."
- Shows response CID with "View on DotSpark" link after submission
- Updated CTAs:
  - Primary: "Explore Intran3t Beta" → https://intran3t.vercel.app/#
  - Secondary: "Learn about Polkadot" → https://polkadot.com
- Applied Polkadot brand colors (warm grey palette: #fafaf9, #e7e5e4, #1c1917, #57534e, #78716c)
- Fixed CID text overflow with proper layout (break-all + min-w-0)
- Success icon uses brand green (#059669)

#### Admin Results View (AdminFormResults.tsx)
- **Form Metadata card:** Changed from blue to Polkadot grey/black scheme
  - Shows Bulletin CID with DotSpark link
  - Displays on-chain Form ID
- **Response Distribution charts:**
  - Moved above responses table for better hierarchy
  - Fixed data accuracy (now calculates from actual decrypted responses)
  - 2-column grid with gradient progress bars
  - Shows real-time counts and percentages
- **Responses Table:**
  - Professional data table with all responses
  - Added CID column with clickable DotSpark links
  - Entry number badges, timestamps, and all form fields
  - Hover states and proper overflow handling
- **Removed clutter:**
  - Removed "X encrypted" badge
  - Removed "X responses decrypted" status message
  - Cleaner, more professional interface

#### Brand Consistency
All changes follow **Polkadot brand guidelines** (docs/brand_guidelines.md):
- Warm grey palette (#1c1917, #78716c, #a8a29e, #e7e5e4)
- Font-serif (DM Serif Display) for headings
- Rounded corners (rounded-xl, rounded-2xl)
- Shadow system (shadow-sm, shadow-md, shadow-lg)
- Professional button styling (px-8 py-4, font-semibold)
- Success green: #059669
- Border colors: #e7e5e4 (default), #d6d3d1 (strong)

#### Files Changed
- `src/modules/forms/FormsWidget.tsx` - Form creation UI improvements
- `src/modules/forms/PublicForm.tsx` - Public form view and success screen
- `src/pages/AdminFormResults.tsx` - Admin analytics and table view
- `src/lib/form-links.ts` - Shortened URL format
- `src/components/PolkadotLogo.tsx` - Used throughout for consistency

### 2026-02-20 - dForms T3rminal Pattern Implementation (COMPLETE)

**Status:** ✅ Fully working end-to-end (Bulletin + Contract + Frontend)

**Architecture:** Complete rewrite following T3rminal pattern:
- **Bulletin Chain** for content storage (decentralized, auto-renewing)
- **Smart Contract** for CID indexing (on-chain registry)
- **Wallet-less voting** via Alice relay (no tokens needed for voters)
- **End-to-end encryption** with AES-256-GCM

#### Contract Layer (Solidity + Hardhat)
- **File**: `contracts/polkavm/contracts/FormsV2.sol` - Simple CID index contract (122 lines)
- **Deployed**: `0xe2F988c1aD2533F473265aCD9C0699bE47643316` (Paseo Asset Hub)
- **Functions**:
  - `registerForm(string formCid) → uint256 formId` - Creator registers form
  - `submitResponse(uint256 formId, string responseCid) → uint256 idx` - Submit response
  - `getFormCid(uint256 formId) → string` - Read form CID
  - `getResponseCids(uint256 formId) → string[]` - Read all response CIDs
  - `getResponseCount(uint256 formId) → uint256` - Get response count
  - `formCount() → uint256` - Get total forms count
- **Events**: `FormRegistered(formId, formCid, creator, timestamp)`, `ResponseSubmitted(formId, idx, responseCid, timestamp)`
- **Built with**: Hardhat + @parity/hardhat-polkadot
- **Test script**: `contracts/polkavm/scripts/test-contract-flow.mjs` (verified working)

#### Bulletin Integration
- **Files**: `src/lib/bulletin/` - Upload/fetch helpers (copied from T3rminal repo)
- **Storage**: `src/lib/bulletin-storage.ts` - PAPI client for `TransactionStorage.store()`
- **Relay**: Uses Alice wallet (`DEV_PHRASE`) for testnet uploads (no auth required on public testnet)
- **CID calculation**: Blake2b-256 → multihash → CIDv1 (matches product-infrastructure reference)
- **Gateway**: `https://ipfs.dotspark.app/ipfs/{cid}`
- **Dependencies**: `@noble/hashes`, `multiformats`, `polkadot-api`

#### Frontend Hooks & Components
- **Hook**: `src/hooks/useFormsContract.ts` - ethers.js-based contract hook (260 lines)
  - `registerForm(formCid)` - Creator registers with MetaMask
  - `submitResponse(formId, responseCid)` - Wallet-based submission
  - `submitResponseViaRelay(formId, responseCid)` - **Wallet-less** submission (Alice relay)
  - `getFormCid(formId)`, `getResponseCids(formId)`, `getResponseCount(formId)` - Read functions
  - `formCount()`, `formExists(formId)` - Utility functions
- **Config**: `src/lib/contracts/` - Network config, provider helpers, ABI
  - `config.ts` - Paseo Asset Hub network config (chain ID: 420420417)
  - `provider.ts` - **Auto network switching** in MetaMask (adds Paseo if needed)
  - `FormsV2ABI.json` - Contract ABI (compiled from Hardhat artifacts)
- **Encryption**: `src/lib/forms-encryption.ts` - AES-256-GCM with Web Crypto API
- **Keys**: `src/lib/form-keys.ts` - Symmetric key generation and storage

#### Form Creation Flow
1. Creator builds form definition JSON: `{ title, description, fields, encryptionPubKey }`
2. Upload to Bulletin via Alice relay → `formCID`
3. Register on contract: `registerForm(formCID)` via MetaMask → `formId`
4. Save to localStorage with `bulletinCid` and `onChainId` fields
5. Share link: `/f/{formId}#key={base64url}`

#### Response Submission Flow (Wallet-less)
1. Load form definition from Bulletin (read `formCID` from contract)
2. Voter fills form → encrypt response with form's public key (AES-256-GCM)
3. Build manifest: `{ formId, ciphertext, nonce, submittedAt }`
4. Upload manifest to Bulletin via Alice relay → `responseCID`
5. Alice relay calls contract: `submitResponse(formId, responseCID)`
6. Show "Response submitted" confirmation (clean UX, no CIDs shown)

#### Admin Results View
- **File**: `src/pages/AdminFormResults.tsx` - Auto-fetch and decrypt responses
- **Flow**:
  1. Read `responseCount` from contract
  2. Fetch all response CIDs: `getResponseCids(formId)`
  3. For each CID: fetch manifest from Bulletin gateway
  4. Decrypt with form key from localStorage
  5. Display response table
- **Features**: CSV export, aggregate charts, response filtering
- **Fallback**: Also loads responses from localStorage (same-device responses)

#### Configuration & Environment
- **Contract address**: `VITE_FORMS_CONTRACT_ADDRESS=0xe2F988c1aD2533F473265aCD9C0699bE47643316`
- **Relay key**: `VITE_RELAY_PRIVATE_KEY` - Alice's private key for wallet-less submissions
- **Network**: Paseo Asset Hub (chain ID: 420420417, RPC: `https://eth-rpc-testnet.polkadot.io`)
- **Bulletin**: `wss://bulletin.dotspark.app` (public testnet, no authorization)

#### Key Improvements Over Previous Implementation
- ✅ Removed PAPI dependency for contract calls (now uses ethers.js + MetaMask)
- ✅ Simpler architecture (no complex manual ABI encoding)
- ✅ Wallet-less voting with Alice relay (voters need zero tokens)
- ✅ Automatic MetaMask network switching (adds Paseo Asset Hub if missing)
- ✅ Contract + Bulletin integration working end-to-end
- ✅ Admin view auto-fetches and decrypts responses from chain
- ✅ Form definitions loaded from Bulletin (shareable links work cross-device)
- ✅ Hardhat-based Solidity workflow (simpler than PolkaVM Rust for prototyping)

#### Testing & Verification
- **Contract test**: `node contracts/polkavm/scripts/test-contract-flow.mjs` → ✅ All functions working
- **End-to-end test**: Form creation → response submission → admin view → ✅ Complete flow working
- **Verified**: Bulletin uploads, contract registration, CID retrieval, decryption

#### Next Steps
- UX improvements for form view and admin results (loading states, error handling)
- Better response analytics and charts
- CSV export enhancements
- DotNS deployment of updated app

---

### 2026-02-17 - dForms PolkaVM Contract + Frontend Integration (SUPERSEDED)

**Status:** Superseded by T3rminal implementation (2026-02-20) ⚠️

#### Smart Contract (`contracts/polkavm/src/forms.rs`)
- Full PolkaVM Rust contract compiled to `target/forms.polkavm` (28KB, 4631 instructions)
- **CRITICAL FIX:** Target JSON `riscv64emac-unknown-none-polkavm.json` must include `+e` in features — `#[polkavm_export]` macro only generates code when `cfg(target_feature = "e")` is true. Added `+e` + PIE flags (`--emit-relocs`, `--unique`, `--apply-dynamic-relocs`, `-Bsymbolic`).
- Correct keccak256 function selectors for all 8 methods (were wrong before fix)
- Functions: `createForm`, `submitResponse`, `recordAggregate`, `getAggregateCount`, `hasSubmitted`, `closeForm`, `formCount`, `getResponseCount`

#### Deploy Script (`contracts/polkavm/scripts/deploy-forms.ts`)
- ES module compatible (uses `fileURLToPath(import.meta.url)`)
- Reads `DOTNS_MNEMONIC` or `MNEMONIC` from `.env`
- Saves result to `deployment_forms.json`
- Run: `cd "/Users/dennisschiessl/Claude Code/Intran3t/contracts/polkavm" && npm run build:forms && npm run deploy:forms`

#### To Deploy (manual — WebSocket blocked in Claude Code)
```bash
cd "/Users/dennisschiessl/Claude Code/Intran3t/contracts/polkavm"
npm run build:forms   # cargo build + polkatool link
npm run deploy:forms  # deploys, saves deployment_forms.json
# Then add to .env:
# VITE_FORMS_CONTRACT_ADDRESS=0x...  (from deployment_forms.json)
```

#### Frontend Hook (`src/hooks/useFormsContract.ts`)
- viem-based EVM hook (no MetaMask required for reads, MetaMask for writes)
- `isConfigured` flag — false when contract address is zero address
- Key exports: `getFormCount`, `getResponseCount`, `checkHasSubmitted`, `getAggregateCount`, `createForm`, `submitResponse`, `recordAggregate`, `closeForm`

#### FormsWidget.tsx + PublicForm.tsx
- `FormsWidget.tsx`: On create, calls `getFormCount()` to predict on-chain ID, then `createForm()` on contract. Falls back to local ID on error.
- `PublicForm.tsx`: After localStorage save, best-effort (non-blocking) contract `submitResponse` + `recordAggregate` calls.
- Both use `useFormsContract()` hook; `isConfigured` guards contract calls.

#### Env Var Required After Deploy
```bash
VITE_FORMS_CONTRACT_ADDRESS=0x...   # from deployment_forms.json
```

#### Pending (Day 3+)
- **Day 3:** Update link format to `/f/{contractId}#key={base64}`, load form from contract (not localStorage)
- **Day 3:** End-to-end test: create form → copy link → submit → verify contract state
- **Day 4:** `AdminFormResults.tsx` — decrypt button, aggregate charts, response table, CSV export
- **Day 4:** `Admin.tsx` — rewrite to forms list with response counts + links to `/admin/forms/:formId`
- **Future:** Bulletin Chain upload for encrypted responses (replace mock CID with real IPFS CID)

### 2026-02-13 - PolkaVM Smart Contract Migration (MAJOR)
- **Migration**: Complete migration from Solidity to PolkaVM Rust contracts
- **Architecture**: Removed RBAC dependency, simplified to permissionless minting
- **Deployment**: Now uses Substrate accounts (no MetaMask) via `pallet_revive`
- **Contract Owner**: Automatically set to derived EVM address from deployer's Substrate account
- **New Directory**: `contracts/polkavm/` - Complete PolkaVM implementation
  - `src/accesspass.rs` - AccessPass contract in Rust (643 lines)
  - `src/lib.rs`, `src/storage.rs`, `src/abi.rs` - Shared utilities
  - `scripts/deploy-accesspass.ts` - Deployment script using @polkadot/api
  - `scripts/compute-selectors.js` - Function selector calculator
  - `scripts/setup-toolchain.sh` - Rust nightly + polkatool installer
  - `Cargo.toml`, `rust-toolchain.toml`, `.cargo/config.toml` - Build configuration
- **Frontend Changes**:
  - **File**: `src/modules/acc3ss/Acc3ssWidget.tsx` - Removed all RBAC membership checks (simplified from 807 to 627 lines)
  - **File**: `src/contracts/intran3t-accesspass.ts` - Added feature flag `VITE_USE_POLKAVM_CONTRACTS` for migration
  - **Removed**: `src/contracts/intran3t-rbac.ts` (8,817 bytes)
  - **Removed**: `src/hooks/useRBACContract.ts` (11,826 bytes)
- **Configuration**:
  - **File**: `.env.example` - Updated with PolkaVM contract address variables
  - **Added**: `VITE_USE_POLKAVM_CONTRACTS` feature flag
  - **Added**: `VITE_ACCESSPASS_CONTRACT_ADDRESS_POLKAVM` for new contract
  - **Deprecated**: `VITE_RBAC_CONTRACT_ADDRESS`, `VITE_DEFAULT_ORG_ID` (no longer used)
- **Deprecation**:
  - **File**: `contracts/solidity/deployments/deprecated.json` - Marked old contracts as deprecated
  - **File**: `contracts/solidity/scripts/deprecate-contracts.ts` - Deprecation record generator
  - Old Solidity AccessPass: `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` → deprecated
  - Old Solidity RBAC: `0xF1152B54404F7F4B646199072Fd3819D097c4F94` → removed
- **Benefits**:
  - ✅ No MetaMask dependency in deployment flow
  - ✅ Uses native Substrate accounts and wallets (Talisman, SubWallet)
  - ✅ Simplified permission model (anyone can mint to themselves)
  - ✅ ABI compatible with existing frontend (same function selectors)
  - ✅ Aligns with Polkadot ecosystem best practices
- **Skill Update**: Added Intran3t deployment patterns to `~/.claude/skills/polkadot-smart-contracts/SKILL.md`
- **Deployment Method**: Derived address pattern (keccak256 truncation) for admin operations
- **User Flow**: Preserved account mapping via `pallet_revive.map_account()` for runtime interactions
- **Status**: ✅ Implementation complete, ⏸️ Deployment paused due to API compatibility issues
- **Current Issue**: PolkaVM contract build fails with `pallet-revive-uapi v0.1.1` API changes
  - Functions `get_storage`, `set_storage`, `clear_storage` not found in crate `api`
  - Rust toolchain upgraded to `nightly-2025-01-15` for Apple Silicon compatibility
  - Added `llvm-abiname: "lp64"` to RISC-V target specification
- **Temporary Approach**: Using existing Solidity contract for testing/deployment (feature flag OFF)
- **Next Steps**:
  1. Update storage.rs to use correct pallet-revive-uapi v0.1.1 API
  2. Deploy PolkaVM contract to testnet
  3. Enable feature flag in `.env`
  4. Test end-to-end with PolkaVM contract

### 2026-02-12 - DotNS Documentation Consolidation & GitHub Actions Reference
- **Cleanup**: Consolidated scattered DotNS documentation into single authoritative guide
- **File**: `DOTNS_DEPLOYMENT.md` - Complete deployment guide (current manual approach + future GitHub Actions reference)
- **File**: `.github/workflows/deploy-dotns.yml` - GitHub Actions workflow example (reference for future apps, not active)
- **Removed**: `DOTNS_DEPLOYMENT_FINDINGS.md` (outdated, superseded by consolidated guide)
- **Archived**: `DOTNS_BULLETIN_FINDINGS.md` → `docs/archive/DOTNS_BULLETIN_FINDINGS_2026-02-06.md` (historical reference)
- **Updated**: `DOTNS_ASSET_LOADING_FIX.md` - Added note pointing to consolidated guide (kept for historical value)
- **Working Example**: Based on https://github.com/andrew-ifrita/amateur_dentistry (https://amateurdentistry00.paseo.li/)
- **Official Workflow**: Referenced `paritytech/dotns-sdk/.github/workflows/deploy.yml@main` for future use
- **Current Approach**: Manual deployment via scripts (works perfectly, will transition to Bulletin native storage later)
- **Future Ready**: GitHub Actions workflow provided as reference for when we deploy via Bulletin Chain natively
- **Documentation**: Single source of truth for all DotNS deployment scenarios

### 2026-02-12 - DotNS Asset Loading Fix (CRITICAL)
- **Fix**: Assets now load correctly from paseo.li gateway (HTTP 200 instead of HTTP 500)
- **Root Cause**: Using `storageCid` (CAR chunks DAG) created non-traversable structure; gateway couldn't resolve nested paths
- **Solution**: Use `ipfsCid` (original IPFS directory structure) for contenthash instead of `storageCid`
- **Implementation**:
  - **File**: `scripts/deploy.js` (lines 353-358) - Prefer `ipfsCid` over `storageCid` for contenthash
  - **File**: `scripts/deploy.js` (line 261) - Enable IPFS pinning (`--pin=true`)
  - **File**: `scripts/deploy.js` (lines 263-265, 307-308) - Add logging for CID tracking
  - **File**: `DOTNS_ASSET_LOADING_FIX.md` - Complete documentation of issue, fix, and workflow
- **Team Guidance**: paseo.li gateway's Bulletin integration not yet mature; use public IPFS until ready
- **Verification**:
  - ✅ Root page: `https://intran3t-app42.paseo.li/` → HTTP/2 200
  - ✅ CSS: `https://intran3t-app42.paseo.li/assets/index-CBwU4fPO.css` → HTTP/2 200
  - ✅ JS: `https://intran3t-app42.paseo.li/assets/index-BhVU0qzW.js` → HTTP/2 200
  - ✅ Public IPFS: `https://dweb.link/ipfs/{cid}/` → HTTP/2 200
- **New CID**: `bafybeidj74ay4huaep73rrgofywumchlcidbqmgggwtso3i2dxsj55ci5q`
- **Transaction**: Contenthash update tx `0x4d0dd3c967423642912af529574c5b1eaf2c109ed6b3170647a65d5fbc3736c2`
- **Trade-off**: Relies on public IPFS network availability; clear migration path to full Bulletin when gateway integration matures
- **Long-term**: Switch to SDK's block-by-block storage or back to `storageCid` when Bulletin integration is stable
- **Key Insight**: Gateway resolution logic works correctly; issue was CAR file structure, not contenthash encoding

### 2026-02-10 - Address Converter Module + Typink Signer Fix (CRITICAL)
- **Feature**: Address Converter utility added as dashboard module
- **File**: `src/components/AddressConverter.tsx` - Converts between H160, SS58 Generic, and SS58 Polkadot formats
- **File**: `src/modules/address-converter/` - Dashboard module wrapper
- **Integration**: Added to ModularDashboard (4 cols × 2 rows, positioned next to Forms module)
- **Conversion Methods**:
  - SS58 → H160: `keccak256(AccountId32)` → last 20 bytes
  - H160 → SS58: Queries `pallet_revive.OriginalAccount` on-chain for mapped address
- **Styling**: Applied Polkadot brand (warm grey palette, font-serif headers, Lucide icons, white background)
- **CRITICAL FIX**: Typink signer access pattern corrected (2026-02-13)
  - **File**: `src/hooks/useAccountMapping.ts` - Fixed to use `signer` from top-level Typink state
  - **File**: `src/hooks/useSubstrateEVMSigner.ts` - Fixed to use `signer` from top-level Typink state
  - **Previous (WRONG)**: `connectedAccount.wallet.signer` (wallet property doesn't exist)
  - **Correct**: `const { signer } = useTypink()` then `tx.signSubmitAndWatch(signer)`
  - **connectedAccount structure**: Only contains `{ source, address, name }` - no wallet property
  - **Pattern**: ALWAYS use `signer` from useTypink() hook, NOT from connectedAccount
- **Configuration Fix**: Removed invalid URL-as-key entry from `.papi/polkadot-api.json`
- **Contract Types**: Fixed Role enum in `src/contracts/intran3t-rbac.ts` to match Solidity (Admin=0, Member=1, Viewer=2, PeopleCulture=3)
- **Routing**: Removed standalone `/address-converter` route from `src/App.tsx` (dashboard-only now)
- **Layout Update**: Moved "+ Add Plugin" below Forms module to new row (8 columns)

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
- **CRITICAL Pattern**: Uses `signer` from useTypink() with `tx.signSubmitAndWatch()` (NOT connectedAccount.wallet)

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

### AddressConverter Component
- **File**: `src/components/AddressConverter.tsx`
- **Purpose**: Utility for converting between address formats (H160, SS58 Generic, SS58 Polkadot)
- **Features**:
  - Real-time conversion with debounced input (300ms)
  - Format validation with helpful error messages
  - Copy-to-clipboard for both input and output
  - Swap formats button
  - Chain status indicator (connects to Paseo Asset Hub)
- **Conversion Methods**:
  - **SS58 → H160**: `keccak256(decodeAddress(ss58))` → last 20 bytes (deterministic derivation)
  - **H160 → SS58**: Queries `pallet_revive.OriginalAccount(h160)` on-chain (requires account mapping)
  - **SS58 ↔ SS58**: Re-encodes with different prefix (42 for Generic, 0 for Polkadot)
- **Styling**: Polkadot brand (warm grey #1c1917, #78716c, #a8a29e, #e7e5e4), font-serif headers, Lucide icons
- **Module Wrapper**: `src/modules/address-converter/AddressConverterWidget.tsx`
- **Used by**: ModularDashboard (4 cols × 2 rows, next to Forms)
- **Dependencies**: `polkadot-api`, `viem`, `@polkadot/util-crypto`, `lucide-react`

### useSubstrateEVMSigner Hook
- **File**: `src/hooks/useSubstrateEVMSigner.ts`
- **Purpose**: Enables Substrate wallets to sign EVM transactions via `pallet_revive`
- **Key functions**:
  - `sendTransaction(txData)` - Sends EVM transactions using Substrate wallet
  - Wraps EVM call data in `pallet_revive.call()` extrinsic
  - Handles gas limits and storage deposits
- **Pattern**: Uses `signer` from useTypink() with `tx.signSubmitAndWatch()`
- **Returns**: `{ sendTransaction, isLoading, error, txHash }`
- **Used by**: Components that need to send EVM transactions with Substrate wallets
- **Prerequisites**: Account must be mapped via `pallet_revive.map_account()` first
- **Notes**: This is the bridge that makes single-wallet UX possible (Substrate auth + EVM contracts)

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
| `VITE_USE_POLKAVM_CONTRACTS` | Feature flag for PolkaVM contracts | `true` | Yes |
| `VITE_ACCESSPASS_CONTRACT_ADDRESS_POLKAVM` | PolkaVM AccessPass contract address | `0x...` (set after deployment) | Yes (when using PolkaVM) |
| `VITE_ACCESSPASS_CONTRACT_ADDRESS` | Legacy Solidity AccessPass address (deprecated) | `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` | No (fallback) |
| `VITE_ASSETHUB_EVM_CHAIN_ID` | Asset Hub EVM chain ID | `420420417` | Yes |
| `VITE_ASSETHUB_EVM_RPC` | Asset Hub EVM RPC endpoint | `https://eth-rpc-testnet.polkadot.io` | Yes |
| `VITE_PEOPLE_CHAIN_RPC` | People Chain WebSocket RPC | `wss://polkadot-people-rpc.polkadot.io` | Yes |
| `VITE_DOTID_API_URL` | dotid.app proxy endpoint | `/api/dotid-proxy` | Yes |
| `VITE_SUBSTRATE_ENDPOINT` | Statement Store endpoint (dForms) | `wss://pop-testnet.parity-lab.parity.io:443/9910` | Yes |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` | No |
| `VITE_ENABLE_DEBUG_LOGS` | Enable debug logging | `true` | No |

> **Updated Feb 13, 2026:** Migrated to PolkaVM contracts.
> - **Current (PolkaVM)**: Deploy via `contracts/polkavm/scripts/deploy-accesspass.ts`
> - **Deprecated (Solidity)**: Old contracts remain on-chain but are no longer maintained
>   - Old AccessPass: `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94`
>   - Old RBAC: `0xF1152B54404F7F4B646199072Fd3819D097c4F94` (removed from project)
> - RPC: `https://eth-rpc-testnet.polkadot.io`
> - Chain ID: `420420417`
> - **Removed**: `VITE_RBAC_CONTRACT_ADDRESS`, `VITE_DEFAULT_ORG_ID` (RBAC removed)

**Configuration Files:**
- `.env` - Local development (gitignored)
- `.env.production` - Production deployment template (committed for reference)
- `.npmrc` - npm configuration (`legacy-peer-deps=true` for compatibility)

## Smart Contracts - PolkaVM Deployment

### Architecture

Intran3t uses PolkaVM Rust contracts deployed via `pallet_revive` with Substrate accounts (no MetaMask required).

**Deployment Pattern:**
- **Admin Operations**: Uses derived EVM addresses (`keccak256(AccountId32)` → last 20 bytes)
- **User Operations**: Uses mapped addresses via `pallet_revive.map_account()`

**Current Contracts:**
- **AccessPass** (PolkaVM Rust): To be deployed - simplified, permissionless minting

**Deprecated Contracts:**
- AccessPass (Solidity): `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` - no longer maintained
- RBAC (Solidity): `0xF1152B54404F7F4B646199072Fd3819D097c4F94` - removed from project

### PolkaVM Build & Deploy

```bash
# Setup toolchain (first time)
cd contracts/polkavm
./scripts/setup-toolchain.sh

# Install dependencies
npm install

# Build AccessPass contract
cargo build --release --bin accesspass
# Output: target/riscv64emac-unknown-none-polkavm/release/accesspass.polkavm

# Deploy to testnet (requires MNEMONIC in .env)
MNEMONIC="your twelve word phrase" npm run deploy:accesspass

# Compute function selectors (for reference)
node scripts/compute-selectors.js
```

### Deployment Record

After deployment, the script creates `contracts/polkavm/deployment_polkavm.json` with:
- Contract address
- Deployer Substrate address
- Deployer EVM address (derived)
- Migration details
- Timestamp

### Contract Owner

The contract owner is automatically set to the **derived EVM address** from your Substrate account:
```
Substrate Address (ss25519) → keccak256(AccountId32) → last 20 bytes → EVM Address
```

This address can revoke access passes and manage the contract.

### Frontend Integration

The frontend automatically switches between Solidity and PolkaVM contracts based on the `VITE_USE_POLKAVM_CONTRACTS` feature flag:

```typescript
// src/contracts/intran3t-accesspass.ts
const USE_POLKAVM = import.meta.env.VITE_USE_POLKAVM_CONTRACTS === 'true';
const POLKAVM_CONTRACT = import.meta.env.VITE_ACCESSPASS_CONTRACT_ADDRESS_POLKAVM;
const SOLIDITY_CONTRACT = '0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94';

export const ACCESSPASS_CONTRACT_ADDRESS =
  USE_POLKAVM && POLKAVM_CONTRACT ? POLKAVM_CONTRACT : SOLIDITY_CONTRACT;
```

**ABI Compatibility:** PolkaVM contract uses the same function selectors as the Solidity version, so no frontend code changes are needed (only address update).

### Key Benefits

- ✅ No MetaMask dependency in deployment
- ✅ Native Substrate wallet support
- ✅ Simplified permission model (no RBAC)
- ✅ ABI compatible with existing frontend
- ✅ Aligns with Polkadot ecosystem standards

### Reference

See `~/.claude/skills/polkadot-smart-contracts/SKILL.md` for complete Intran3t deployment patterns and examples.

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

### Smart Contract Scripts

**PolkaVM Scripts (contracts/polkavm/scripts/):**
```bash
# Build & Deploy
./scripts/setup-toolchain.sh              # Setup Rust nightly + polkatool (first time)
npm run build:accesspass                  # Build AccessPass contract
MNEMONIC="..." npm run deploy:accesspass  # Deploy to testnet

# Utilities
node scripts/compute-selectors.js         # Compute EVM function selectors
```

**Legacy Solidity Scripts (contracts/solidity/scripts/ - deprecated):**
```bash
# Account Mapping (still useful)
node scripts/check-mapping.js <substrate-address>     # Check if account is mapped to EVM

# Deprecation
npx tsx scripts/deprecate-contracts.ts                # Generate deprecation record
```

**Note:** RBAC-related scripts (find-my-orgs, create-org, grant-admin) have been removed as RBAC is no longer used.

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

- **Typink + PAPI Signer Access (CRITICAL)**: When using Typink with PAPI to build Substrate transactions:
  - ✅ ALWAYS: `const { signer } = useTypink()` then `tx.signSubmitAndWatch(signer)` then `await result.ok`
  - ❌ NEVER: `connectedAccount.wallet.signer` (wallet property doesn't exist on connectedAccount)
  - ❌ NEVER: `connectedAccount.polkadotSigner` (doesn't exist)
  - ❌ NEVER: `tx.signAsync()` (wrong pattern for wallet signing)
  - This pattern applies to ALL PAPI transactions requiring wallet signatures (account mapping, EVM calls via pallet_revive, etc.)
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
