# Intran3t - Operational Context

**TL;DR:** Decentralized workplace app on Polkadot. Forms + Access Passes + Identity. Live: https://intran3t.vercel.app + https://intran3t-app42.paseo.li

**BLUF:** Use dForms for surveys, Acc3ss for NFT passes. Substrate wallets preferred. Account mapping required for contract calls.

---

## Current Stack

**Architecture:**
- **Frontend:** React + TypeScript + Vite + Tailwind
- **Blockchain:** Polkadot (Paseo testnet), People Chain, Bulletin Chain
- **Wallets:** Typink (Substrate), MetaMask (EVM)
- **Contracts:** Solidity on AssetHub (FormsV2, AccessPass)
- **Storage:** Bulletin (content), localStorage (keys), People Chain (identity)
- **Deployment:** Vercel (traditional) + DotNS (decentralized)

**Live Deployments:**
- Production: https://intran3t.vercel.app
- DotNS: https://intran3t-app42.paseo.li
- Domain: `intran3t-app42.dot`

---

## Critical Patterns

### 1. Typink Signer Access (CRITICAL)

```typescript
// ✅ CORRECT
const { signer } = useTypink()
const tx = apiClient.tx.Revive.map_account({})
const result = await tx.signSubmitAndWatch(signer)
await result.ok

// ❌ WRONG
connectedAccount.wallet.signer  // wallet property doesn't exist
connectedAccount.polkadotSigner  // doesn't exist
tx.signAsync()  // wrong pattern
```

**Why:** `connectedAccount` only has `{ source, address, name }`. Signer comes from top-level Typink hook.

### 2. Form ID Handling

Always use `f.onChainId || f.id` when querying contracts:
```typescript
const onChainId = form.onChainId || form.id
const count = await getResponseCount(Number(onChainId))
```

**Why:** Local forms use UUIDs, on-chain forms use numeric IDs.

### 3. Account Mapping

Substrate wallets need mapping before contract calls:
```typescript
const { isMapped, mapAccount } = useAccountMapping()
if (!isMapped) {
  await mapAccount() // Triggers pallet_revive.map_account()
}
```

---

## Smart Contracts

### FormsV2 (Solidity)
- **Address:** `0xe2F988c1aD2533F473265aCD9C0699bE47643316`
- **Chain:** Paseo AssetHub (420420417)
- **Purpose:** CID registry for forms + responses
- **Key Functions:** `registerForm(cid)`, `submitResponse(formId, cid)`, `getResponseCount(formId)`

### AccessPass (Solidity - Deprecated)
- **Address:** `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94`
- **Status:** Legacy, permissionless minting works but no longer maintained
- **RBAC Contract (REMOVED):** `0xF1152B54404F7F4B646199072Fd3819D097c4F94` - Deprecated, RBAC removed from codebase

---

## Environment Variables

```bash
# Network
VITE_ASSETHUB_EVM_RPC=https://eth-rpc-testnet.polkadot.io
VITE_ASSETHUB_EVM_CHAIN_ID=420420417
VITE_PEOPLE_CHAIN_RPC=wss://polkadot-people-rpc.polkadot.io

# Contracts
VITE_FORMS_CONTRACT_ADDRESS=0xe2F988c1aD2533F473265aCD9C0699bE47643316
VITE_ACCESSPASS_CONTRACT_ADDRESS=0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94

# Services
VITE_DOTID_API_URL=/api/dotid-proxy
BULLETIN_RPC=wss://bulletin.dotspark.app

# Relay (wallet-less submissions)
VITE_RELAY_PRIVATE_KEY=<Alice_private_key>  # For testnet only

# DotNS (deployment only)
DOTNS_MNEMONIC=your twelve word phrase
DOTNS_DOMAIN=intran3t-app42
PASEO_ASSETHUB_RPC=wss://sys.ibp.network/asset-hub-paseo
```

---

## Commands

### Development
```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run preview      # Preview build
```

### Deployment
```bash
# Vercel
vercel               # Preview deployment
vercel --prod        # Production deployment

# DotNS
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:dotns
```

### Contracts
```bash
# Test Forms contract
node contracts/polkavm/scripts/test-contract-flow.mjs

# Check account mapping
node contracts/solidity/scripts/check-mapping.js <substrate-address>
```

---

## Key Files

### Forms Module
- `src/modules/forms/FormsWidget.tsx` - Form creation UI
- `src/modules/forms/PublicForm.tsx` - Form submission (wallet-less via Alice relay)
- `src/pages/AdminFormResults.tsx` - Response viewing + decryption
- `src/hooks/useFormsContract.ts` - Contract interactions (ethers.js)
- `src/lib/bulletin-storage.ts` - Bulletin upload/fetch
- `src/lib/forms-encryption.ts` - AES-256-GCM encryption

### Access Passes
- `src/modules/acc3ss/Acc3ssWidget.tsx` - NFT minting UI
- `src/hooks/useAccountMapping.ts` - Account mapping hook
- `src/components/MapAccountModal.tsx` - Mapping flow UI

### Identity & Search
- `src/services/dotid-registry.ts` - People Chain identity API
- `src/hooks/useUserSearch.ts` - Combined local + registry search
- `api/dotid-proxy.js` - CORS proxy (Vercel serverless)

---

## Common Issues

### Response Counts Don't Match
**Problem:** Different counts on `/admin`, `/dashboard`, `/admin/forms/7`
**Cause:** Using `form.id` instead of `form.onChainId` when querying contract
**Fix:** Always use `form.onChainId || form.id`

### Forms Widget Scrolling
**Problem:** Can't see Create Form button
**Fix:** Reduced spacing, textarea rows, padding (now fits without scroll)

### Account Mapping Failed
**Problem:** "Transaction failed" when mapping account
**Cause:** Insufficient balance or wrong RPC endpoint
**Fix:** Use `https://eth-rpc-testnet.polkadot.io`, get PAS from faucet

### DotNS Gateway 404
**Problem:** Domain registered but not loading
**Cause:** Wrong RPC during deployment (contract addresses differ per RPC)
**Fix:** Always use `wss://sys.ibp.network/asset-hub-paseo` for DotNS

---

## DotNS Deployment (Decentralized Hosting)

### Quick Deploy
```bash
# Build + upload to Bulletin + register domain
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:dotns
```

### Manual Steps
```bash
# 1. Build
npm run build

# 2. Get CID from Bulletin (via scripts/deploy.js)
# 3. Set contenthash (via dotns-cli)
cd ~/product-infrastructure/examples/pop-dotns
bun run dev content set intran3t-app42 <cid> --mnemonic "<mnemonic>"
```

### External Tools Required
```bash
# Clone product-infrastructure (for dotns-cli)
git clone git@github.com:paritytech/product-infrastructure.git ~/product-infrastructure
cd ~/product-infrastructure/examples/pop-dotns
bun install && bun papi
```

### Critical Notes
- **RPC:** Must use `wss://sys.ibp.network/asset-hub-paseo` (contract addresses differ per RPC)
- **Memory:** Use `NODE_OPTIONS="--max-old-space-size=8192"` to prevent heap errors
- **Gateway:** Only `paseo.li` works (`bigtava.online` has issues)
- **Domain naming:** 8+ chars, exactly 2 trailing digits (e.g., `myapp42`)
- **Contenthash:** Must be ENSIP-7 compliant (`0xe3` + `0x01` + CID bytes)

### DotNS Contract Addresses (Paseo AssetHub)
**CRITICAL:** These are specific to `wss://sys.ibp.network/asset-hub-paseo`
```
DOTNS_REGISTRAR: 0x329aAA5b6bEa94E750b2dacBa74Bf41291E6c2BD
DOTNS_REGISTRAR_CONTROLLER: 0xd09e0F1c1E6CE8Cf40df929ef4FC778629573651
DOTNS_REGISTRY: 0x4Da0d37aBe96C06ab19963F31ca2DC0412057a6f
DOTNS_RESOLVER: 0x95645C7fD0fF38790647FE13F87Eb11c1DCc8514
DOTNS_CONTENT_RESOLVER: 0x7756DF72CBc7f062e7403cD59e45fBc78bed1cD7
```

### Current Deployment
- Domain: `intran3t-app42.dot`
- CID: `bafybeibm6rfptryqpmfvffd65qsw5xkuj2l3wwjodtj5ksjkff3hxf7rcy`
- URL: https://intran3t-app42.paseo.li

---

## Architecture Details

### dForms Flow (Wallet-less Voting)
1. Creator builds form → uploads to Bulletin → registers on contract → gets form ID
2. Voter loads form from Bulletin → fills → encrypts with form key (AES-256-GCM)
3. Alice relay uploads encrypted response to Bulletin → submits CID to contract
4. Admin fetches response CIDs from contract → fetches manifests from Bulletin → decrypts

**Key:** Voters need zero tokens (Alice relay pays gas)

### Account Mapping (Substrate → EVM)
1. Derive EVM address: `keccak256(AccountId32)` → last 20 bytes
2. Check mapping: Query `pallet_revive.OriginalAccount(evmAddress)`
3. Map account: Call `pallet_revive.map_account()` via Substrate wallet
4. Result: Substrate wallet can now sign EVM transactions

**Priority:** mapped EVM > MetaMask > derived address

### Storage Strategy
- **Bulletin:** Form definitions, encrypted responses (2-week TTL, auto-renewing)
- **Contract:** Form/response CID registry (permanent)
- **localStorage:** Encryption keys (client-side only)
- **People Chain:** Identity data (permanent, on-chain)

---

## Pending Work / TODOs

### ✅ Complete (Using Workarounds)
- **PolkaVM Contracts:** Implementation done, deployment blocked by API changes
  - **Issue:** `pallet-revive-uapi v0.1.1` API breaking changes
  - **Missing:** `get_storage`, `set_storage`, `clear_storage` functions
  - **Workaround:** Using Solidity contracts (feature flag `VITE_USE_POLKAVM_CONTRACTS=false`)
  - **Next Steps:**
    1. Update `contracts/polkavm/src/storage.rs` to use correct v0.1.1 API
    2. Deploy PolkaVM AccessPass to testnet
    3. Enable feature flag in `.env`
    4. Test end-to-end with PolkaVM contracts

### 🔄 In Progress / Enhancement Ideas
- **Forms UX:** Loading states, error handling improvements
- **Analytics:** Better response charts, CSV export enhancements
- **Statement Store:** Ephemeral storage option (2-week TTL, currently using Bulletin)

### 📋 Backlog
- Migrate from Solidity to PolkaVM contracts (blocked on API compatibility)
- GitHub Actions workflow for DotNS deployment (manual works fine)
- Multi-language support for forms

### 🗄️ Deprecated / Superseded
- **PolkaVM Rust implementation** (2026-02-17): Superseded by Solidity + Hardhat approach (simpler for prototyping)
- **Statement Store integration** (2026-01-28): Replaced by Bulletin Chain (better persistence)
- **RBAC system**: Removed entirely, simplified to permissionless model
- See git history for detailed implementation notes if needed

---

## Recent Changes (Last 7 Days)

### 2026-02-23
- Fixed response count sync across all views (Admin, Dashboard, Forms widget)
- Optimized Forms widget spacing to eliminate scrolling
- All views now use `form.onChainId || form.id` for contract queries

### 2026-02-20
- DotNS deployment with ENSIP-7 contenthash fix
- Forms UI polish (Polkadot brand colors, blockchain animation, radio buttons)
- Bulletin manifest v1.0.0 structure (T3rminal-inspired JSON)

### 2026-02-17-20
- Complete dForms T3rminal pattern (Bulletin + Contract + Frontend)
- Wallet-less voting via Alice relay
- Admin view auto-fetch/decrypt from chain

### 2026-02-13
- PolkaVM contract migration (paused - API compatibility issues)
- Removed RBAC dependency (simplified to permissionless)

### 2026-02-10
- Address Converter module
- Typink signer access pattern fixed
- DotNS contenthash encoding fixed (ENSIP-7 compliance)

---

## Testing

### Quick Checks
```bash
# Forms flow
1. Create form → copy link → submit as voter → check /admin/forms/{id}

# Account mapping
2. Connect Substrate wallet → map account → verify in Acc3ss module

# DotNS
3. Deploy → check https://<domain>.paseo.li loads
```

### Manual Checklist
- [ ] Form creation + submission + admin view decryption
- [ ] Access pass minting (Substrate mapped vs MetaMask)
- [ ] Search (local users + People Chain registry)
- [ ] Account mapping flow
- [ ] Response counts match across all views

---

## Resources

- [README.md](./README.md) - Setup + architecture
- [Polkadot CONTEXT](~/.claude/POLKADOT_CONTEXT.md) - Ecosystem patterns
- [DotNS Guide](~/.claude/POLKADOT_DOTNS_DEPLOYMENT.md) - Deployment reference
- [People Chain](https://dotid.app/) - Identity registry
- [Faucet](https://faucet.polkadot.io/) - Get PAS tokens
