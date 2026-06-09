# Intran3t - Operational Context

**TL;DR:** Decentralized workplace app on Polkadot. Forms + Access Passes + Identity. Live: https://intran3t.dot.li (DotNS) / Triangle: intran3t.dot

**BLUF:** Use dForms for surveys, Acc3ss for NFT passes. Substrate wallets preferred. Account mapping required for contract calls.

---

## Current Stack

**Architecture:**
- **Frontend:** React + TypeScript + Vite + Tailwind
- **Blockchain:** Polkadot (Paseo testnet), People Chain, Bulletin Chain
- **Wallets:** `@novasamatech/product-sdk` — host path (Triangle) + browser fallback (Talisman/SubWallet)
- **Contracts:** Solidity on AssetHub (FormsV2, AccessPass)
- **Storage:** Bulletin (content), localStorage (keys), People Chain (identity)
- **Deployment:** DotNS (`bulletin-deploy`)

**Live Deployments:**
- Browser: https://intran3t.dot.li
- Triangle: `intran3t.dot`

---

## Critical Patterns

### 1. Signing Stack (CRITICAL)

Two paths — both flow through `WalletProvider.tsx`:

**Host path (Triangle Desktop/Mobile/Web):**
```typescript
const result = await accounts.getProductAccount('intran3t.dot', 0)
const signer = accounts.getProductAccountSigner(result.value, 'createTransaction')
// mortal:true required — Spektr silently drops immortal sign requests
await tx.signSubmitAndWatch(signer, { mortality: { mortal: true, period: 256 } })
```

**Browser fallback (Talisman/SubWallet):**
```typescript
// connectInjectedExtension's built-in signer throws on AsPgas — replace it
const ext = await connectInjectedExtension('talisman')
const signer = createStandaloneTxSigner({ extensionName: 'talisman', address, ... })
```

**EVM contract calls — always via `useSubstrateEVMSigner`:**
```typescript
await substrateSigner.sendTransaction({ to: contractAddress, data: callData, value: 0n })
```

**Never use:** `useTypink()`, `getBrowserSigner()`, `window.ethereum`, `@parity/product-sdk-signer`

Key files: `src/lib/wallet-provider.ts`, `src/hooks/useSubstrateEVMSigner.ts`, `src/providers/WalletProvider.tsx`

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

# Relay (wallet-less submissions)
VITE_RELAY_PRIVATE_KEY=<Alice_private_key>  # For testnet only

# DotNS (deployment only) — bulletin-deploy v0.9.0
# MNEMONIC env var (not DOTNS_MNEMONIC) or use `bulletin-deploy login` instead
MNEMONIC=your twelve word phrase
DOTNS_DOMAIN=intran3t-app42
# BULLETIN_RPC and PASEO_ASSETHUB_RPC are no longer needed — handled by --env paseo-next-v2
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
# DotNS — bulletin-deploy v0.9.0
# Option A: mnemonic in env
MNEMONIC="..." bulletin-deploy ./dist intran3t.dot --env paseo-next-v2 --js-merkle

# Option B: login with Polkadot mobile app (no mnemonic needed)
bulletin-deploy login
bulletin-deploy ./dist intran3t.dot --env paseo-next-v2 --js-merkle

# Deploy to preview env
bulletin-deploy ./dist intran3t.dot --env preview --js-merkle

# Check who's signed in
bulletin-deploy whoami
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
---

## Common Issues

### Form Creation - Invalid Byte Sequence
**Problem:** Form creation fails with "Invalid byte sequence" error, UUID links instead of numeric IDs
**Cause:** Trailing `\n` in env var value for `VITE_FORMS_CONTRACT_ADDRESS`
**Fix:** Code uses `.trim()` on env vars before passing to ethers.js

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
**Cause:** Wrong `--env` during deployment, or deploying to preview but checking paseo gateway
**Fix:** Use `--env paseo-next-v2` for `*.paseo.li`, `--env preview` for `*.previewnet.paseo.li`

---

## DotNS Deployment (Decentralized Hosting)

### bulletin-deploy v0.9.0

One command deploys: Bulletin upload + DotNS contenthash update.

```bash
npm run build

# With mnemonic
MNEMONIC="..." bulletin-deploy ./dist intran3t.dot --env paseo-next-v2 --js-merkle

# With Polkadot mobile login (preferred — no mnemonic in shell)
bulletin-deploy login
bulletin-deploy ./dist intran3t.dot --env paseo-next-v2 --js-merkle

# To preview environment
bulletin-deploy ./dist intran3t.dot --env preview --js-merkle

# Publish to on-chain Publisher registry (paseo-next-v2 only)
bulletin-deploy ./dist intran3t.dot --env paseo-next-v2 --js-merkle --publish
```

Available environments: `paseo-next-v2` (default), `preview`, `preview-pvm`, `paseo-next`, `polkadot`, `kusama`

### Critical Notes
- `--env` handles all RPC and contract addresses — no manual `BULLETIN_RPC` or `PASEO_ASSETHUB_RPC` needed
- `--js-merkle` always (no IPFS Kubo binary required)
- Gateway: `paseo.li` (paseo-next-v2), `previewnet.paseo.li` (preview)
- Domain: 8+ chars, exactly 2 trailing digits (e.g., `intran3t-app42`)
- `bulletin-deploy whoami` to check current login state

### Current Deployment
- Domain: `intran3t.dot`
- Paseo-next-v2 CID: `bafybeihh6lo7mjkhedq5uwim4wmo2ik735qmny5m5t37giojqhwpnvbx3q` (deployed 2026-06-09)
- Preview CID: `bafybeih6vfnere5bwam37wh5443p6zyh4uqpqcymqcffqpdzs4gvbnufpe` (deployed 2026-06-09)

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

**Note:** product-sdk derives the EVM address from the Substrate account — no MetaMask needed.

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

## Recent Changes

### 2026-05-29
- DotNS contracts updated for `bulletin-deploy` 0.7.29 → 0.9.0 (new contract addresses on paseo-next-v2)
- Deployed: Preview CID `bafybeig2oimscx4jrejmdhlaqfvmli6urnyljufe6fhino5srjj4g34aym`, Paseo-next-v2 CID `bafybeibjl3tkbeha5vesgtf7h4zhauqqko4crgspfwdjuwg34et5buzjty`

### 2026-05-26
- Office map seat selection fix, host account display name fix

### 2026-05-22
- **ParityDAO module:** On-chain governance via Solidity contract
- **Signing stack upgrade:** Migrated to `createTransaction` host path + `createStandaloneTxSigner` browser fallback (product-sdk v0.7.9-4)
- **Profile PoP:** Proof of Personhood integration
- Form UX improvements
- PAPI descriptors updated to Paseo Next v2
- All Bulletin + Asset Hub endpoints migrated to v2

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
- [ ] Access pass minting (map account → mint via Substrate signer)
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
