# Intran3t: Your workplace, on Polkadot. A O/S Product Prototype

**TL;DR:** Intran3t is a fully web3 "intran3t-app" that integrates key workplace functions and functionalities as plugins under a single interface, running entirely on Polkadot. Current scope includes on-chain identy, decentralised Forms (encrypted, wallet-less submissions), NFT access passes to our locations (proof of concept) and an address converter. Deployments via DotNS/Bulletin + traditional hosting via Vercel
---

## Overview

### dForms - Decentralized Encrypted Forms

**What it does:**
Create polkadot-branded forms → voters submit responses → admin decrypts results. All on Polkadot infrastructure.

**Why it matters:**
Voters don't need wallets or tokens. Responses encrypted. Permanent on-chain registry.

**Real use case flow:**

1. **Creator:** Builds form with fields (text, email, select, multiselect) - Note: currently creration is only possible via MetaMask...
   - Generates AES-256-GCM encryption key locally
   - Uploads form definition to Bulletin Chain (decentralized storage)
   - Registers on FormsV2 contract (Paseo Asset Hub)
   - Gets shareable link with encryption key fragment

2. **Voter:** Receives link → fills form → submits
   - No wallet required
   - Response encrypted client-side
   - Alice relay pays gas (testnet)
   - Response stored on Bulletin + CID indexed on-chain

3. **Admin:** Views `/admin/forms/{id}`
   - Fetches response CIDs from contract
   - Downloads encrypted manifests from Bulletin
   - Decrypts using local key
   - Exports CSV, views aggregated stats

**Technical stack:**
- **Storage:** Bulletin Chain (2-week auto-renewal, ~free on testnet)
- **Registry:** FormsV2 Solidity contract (`0xe2F988...3316` on Paseo AssetHub)
- **Encryption:** AES-256-GCM (Web Crypto API)
- **Wallet-less:** Alice relay signs submissions (testnet only)
- **Keys:** localStorage (creator's device)

**Blockchain components:**
- Bulletin RPC: `wss://bulletin.dotspark.app`
- Paseo AssetHub EVM: `https://eth-rpc-testnet.polkadot.io` (chain ID 420420417)
- Gateway: `https://ipfs.dotspark.app/ipfs/{cid}`

**Current status:** ✅ Working end-to-end on testnet

**Potential use cases:** anonymous feedback, social media posts with polkadot branded forms to gather data, internal forms on vote, sentiment, move or book votings, + much more [be creative]

---

### Acc3ss - NFT Access Passes

**What it does:**
Mint ERC-1155 NFTs as access passes for physical/digital locations. QR codes for verification.

**How it works:**
1. Connect Substrate wallet (Talisman, SubWallet) or MetaMask
2. Map account (Substrate wallets only, one-time setup)
3. Select location (e.g., "Berlin Office")
4. Mint pass with 24-hour expiration
5. Download QR code
6. Scan at entrance → verified on-chain

**Technical details:**
- **Contract:** AccessPass Solidity (`0xfd2a6E...6Df94` on Paseo AssetHub)
- **Standard:** ERC-1155 (multi-token)
- **Account Mapping:** pallet_revive on AssetHub (Substrate → EVM)
- **Derived Address:** `keccak256(AccountId32)` → last 20 bytes

**Current status:** ✅ Minting works, QR generation works, expiration logic on-chain

---

### Governance Polls

**What it does:**
Create on-chain polls with balance-weighted voting. Permanent storage via System Remarks.

**Features:**
- 3-option voting (Aye/Nay/Abstain)
- 1-30 day duration
- PAS balance as voting weight
- One vote per account
- Optional on-chain storage (System Remarks on AssetHub)
- Local storage fallback

**Current status:** ✅ Functional, System Remarks integration complete

---

### Identity & Profile

**What it does:**
Display on-chain identity from Polkadot People Chain. Shows verified badge, linked accounts (Twitter, GitHub, Discord), balance.

**Chain:** Polkadot People Chain (`wss://polkadot-people-rpc.polkadot.io`)

**Current status:** ✅ Working

---

### Address Converter

**What it does:**
Convert between Substrate (32-byte) and EVM (20-byte) addresses.

**Methods:**
- Truncated: First 20 bytes (used in Forms)
- Keccak256: `keccak256(AccountId32)` → last 20 bytes (used in Acc3ss, pallet_revive standard)

**Current status:** ✅ Utility module, always accessible

---

## Architecture

### Polkadot Chains Used

| Chain | Purpose | What We Store |
|-------|---------|---------------|
| **Bulletin Chain** | Decentralized storage | Form definitions, encrypted responses |
| **Paseo Asset Hub** | Smart contracts (EVM) | FormsV2 registry, AccessPass NFTs |
| **Polkadot People Chain** | Identity | Email, Twitter, GitHub, Discord links |
| **Paseo Relay** | Governance | System Remarks (poll votes) |

### Smart Contracts

| Name | Address | Chain | Type | Purpose |
|------|---------|-------|------|---------|
| **FormsV2** | `0xe2F988c1aD2533F473265aCD9C0699bE47643316` | Paseo AssetHub | Solidity | Form/response CID registry |
| **AccessPass** | `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` | Paseo AssetHub | Solidity ERC-1155 | NFT access passes |

### Storage Strategy

| Location | Data | Retention | Cost |
|----------|------|-----------|------|
| **Bulletin** | Form definitions, responses | 2 weeks (auto-renew) | ~Free (testnet) |
| **Contract** | CID registry | Permanent | Gas fees |
| **localStorage** | Encryption keys | Browser session | Free |
| **People Chain** | Identity | Permanent | Deposit required |

### Wallet Integration

**Substrate (Typink):**
- Polkadot.js, Talisman, SubWallet
- Used for: Form creation, polls, identity

**EVM (MetaMask):**
- MetaMask, any Ethereum wallet
- Used for: AccessPass minting, contract calls

**Account Mapping:**
- Substrate wallets → derive EVM address via pallet_revive
- One-time setup, enables cross-VM signing

---

## Deployment

### Live URLs

| URL | Type | Status |
|-----|------|--------|
| https://intran3t.vercel.app | Vercel (traditional) | Production |
| https://intran3t-app42.paseo.li | DotNS (decentralized) | Production |

### DotNS (Decentralized Hosting)

**How it works:**
1. Build static app (HTML, React, Next.js)
2. Upload to Bulletin Chain → get CID
3. Register `.dot` domain on Paseo AssetHub
4. Set contenthash to CID
5. Gateway resolves `{domain}.paseo.li` → Bulletin content

**Current deployment:**
- Domain: `intran3t-app42.dot`
- CID: `bafybeigcsn6mjbuf6gmrf5saze54tqullwnv7v7epugklfd7sw6r7zs4xm`
- Deployed: 2026-02-20

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Blockchain API** | PAPI (Polkadot-API) + smoldot (light client) |
| **EVM Integration** | ethers.js + Hardhat |
| **Wallets** | Typink (Substrate), MetaMask (EVM) |
| **Encryption** | Web Crypto API (AES-256-GCM) |
| **Deployment** | Vercel + DotNS (Bulletin Chain) |

---

## What Works (Production-Ready on Testnet)

- ✅ dForms: Creation, wallet-less submission, encrypted storage, admin decryption
- ✅ Acc3ss: NFT minting, QR generation, on-chain expiration
- ✅ Governance: Balance-weighted polls, System Remarks storage
- ✅ Identity: People Chain integration, verified badges
- ✅ Address Converter: Substrate ↔ EVM conversion
- ✅ DotNS: Decentralized hosting on Bulletin Chain

---

## Known Limitations

**Testnet-only patterns:**
- Alice relay (DEV_PHRASE) for wallet-less submissions → needs dedicated service for production
- Bulletin auto-renewal relies on testnet faucet → needs paid renewal mechanism

**UX constraints:**
- Encryption key stored on creator's device → no cross-device sync (by design for privacy)
- Account mapping is one-time but manual (required for Substrate wallets calling EVM contracts)

**Deprecated/removed:**
- RBAC system (simplified to permissionless)
- PolkaVM contracts (API compatibility issues; using Solidity instead)

---

## What's Next

### Near-term (Q1 2026)
- Production relay service (replace Alice testnet key)
- Bulletin renewal automation (paid storage)
- Multi-device key sync (optional, encrypted)

### Medium-term (Q2 2026)
- PolkaVM migration (blocked on pallet-revive-uapi v0.1.1 compatibility)
- Forms analytics dashboard
- Access pass revocation UI

### Long-term
- Mainnet deployment
- Host API integration (Polkadot.com/Mobile/Desktop distribution)
- Multi-language support

---

## Try It

**Live app:** https://intran3t.vercel.app

**Test flow:**
1. Connect wallet (Talisman/SubWallet recommended)
2. Create form → get shareable link (currently only possible via MetaMask and EVM account derivation from your Substrate account)
3. Open link in incognito → submit as voter (no wallet)
4. View `/admin/forms/{id}` → see encrypted responses decrypted

**Get PAS tokens:** https://faucet.polkadot.io/ (Paseo testnet)

