# Intran3t

> Decentralized workplace app on Polkadot. Forms, access passes, and on-chain identity in a modular dashboard.

**Product Owner:** Dennis Schiessl, Parity Technologies
**Target Distribution:** Polkadot Triangle (Desktop, Mobile, Web)
**Last Updated:** May 2026

---

## Live

| Channel | URL |
|---------|-----|
| Polkadot Desktop | `intran3t.dot` |
| Browser | https://intran3t.dot.li |
| Vercel | https://intran3t.vercel.app |

---

## Overview

Intran3t is a modular intranet-style app running fully on Polkadot. It demonstrates core workplace primitives built on decentralized infrastructure: forms with encrypted responses, NFT-based access passes, and People Chain identity.

It runs inside the Polkadot Triangle host (Desktop/Mobile/Web) and uses the Product SDK to integrate with the host's account and signing system. In standalone browser mode, it connects to Substrate wallet extensions directly.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 4 |
| Chain API | PAPI (`polkadot-api`) |
| Host integration | `@novasamatech/product-sdk` |
| EVM interaction | ethers.js 6 |
| Identity | `@polkadot/util-crypto`, `decodeAddress` |
| Storage | Bulletin Chain (content), localStorage (keys) |
| Hosting | DotNS (`bulletin-deploy`) + Vercel |

### Target Chains

- **Paseo Asset Hub** (testnet): Smart contracts (FormsV2, AccessPass), account mapping (`pallet_revive`)
- **Paseo People Chain**: On-chain identity verification
- **Paseo Bulletin Chain**: Decentralized content storage (form definitions, encrypted responses)

---

## Features

### Profile Module

Displays on-chain identity from People Chain: verified name, social accounts (Matrix, GitHub, Twitter, Discord, email, website), real-time balance, and identicon.

### Forms Module (dForms)

Privacy-preserving form builder with wallet-less submission:

- Creator builds a form and uploads it to Bulletin Chain
- Form is registered on the FormsV2 contract (on-chain CID index)
- Respondents submit via a public link with no wallet needed (Alice relay pays gas on testnet)
- Responses are AES-256-GCM encrypted before upload to Bulletin
- Admin fetches and decrypts responses on demand
- Full on-chain audit trail via the FormsV2 contract

### Acc3ss Module

ERC-721 access passes as NFTs via the AccessPass smart contract:

- Mint location-specific access passes
- Substrate wallets sign EVM transactions via `pallet_revive` account mapping
- Deterministic Substrate-to-EVM address derivation (`keccak256(AccountId32)` last 20 bytes)

### Account Mapping

Substrate wallets need to be mapped once before signing EVM transactions:

1. Derive EVM address from Substrate address
2. Check on-chain via `pallet_revive.OriginalAccount`
3. Call `pallet_revive.map_account()` to register
4. Mapping state cached in localStorage after confirmation

---

## Smart Contracts

All deployed on **Paseo Asset Hub** (chain ID `420420417`):

| Contract | Address |
|----------|---------|
| FormsV2 | `0xe2F988c1aD2533F473265aCD9C0699bE47643316` |
| AccessPass | `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` |

---

## Architecture

### Triangle Host Integration

The app detects whether it runs inside the Polkadot Triangle host (`window.__HOST_WEBVIEW_MARK__` or iframe) and adjusts accordingly:

- **In host:** Uses `createPapiProvider(genesisHash, wsProvider)` to route chain calls through the host's light client, with WS as fallback. Accounts and signing are injected by the host via `injectSpektrExtension`.
- **Standalone:** Connects to WS RPC endpoints directly, prompts for Substrate wallet extension.

### Storage Architecture

| Data | Storage |
|------|---------|
| Form definitions | Bulletin Chain |
| Encrypted responses | Bulletin Chain |
| CID index (forms/responses) | FormsV2 smart contract |
| Encryption keys | localStorage (creator only) |
| Identity data | People Chain (permanent, on-chain) |
| Access passes | AccessPass smart contract (ERC-721) |

### Wallet-Less Submission Flow

1. Respondent loads public form link (no wallet required)
2. Form content fetched from Bulletin via CID stored in contract
3. Response encrypted client-side with form's AES-256-GCM key
4. Alice relay (testnet) uploads encrypted response to Bulletin
5. Alice relay submits response CID to FormsV2 contract
6. Admin decrypts using key from localStorage

---

## Setup

### Prerequisites

```bash
node >= 22
npm
```

### Install

```bash
git clone https://github.com/dennisparity/intran3t.git
cd intran3t
npm install
```

### Environment

Copy `.env.example` to `.env`:

```bash
VITE_ASSETHUB_EVM_RPC=https://eth-rpc-testnet.polkadot.io
VITE_ASSETHUB_EVM_CHAIN_ID=420420417
VITE_FORMS_CONTRACT_ADDRESS=0xe2F988c1aD2533F473265aCD9C0699bE47643316
VITE_ACCESSPASS_CONTRACT_ADDRESS=0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94
VITE_RELAY_PRIVATE_KEY=<Alice_private_key>  # Testnet only
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## Deployment

### DotNS (Decentralized)

Uses [`bulletin-deploy`](https://github.com/paritytech/bulletin-deploy) CLI:

```bash
# Build first
npm run build

# Deploy to Bulletin + update DotNS in one command
set -a; source .env; set +a
NODE_OPTIONS="--max-old-space-size=8192" bulletin-deploy ./dist intran3t.dot --js-merkle
```

`MNEMONIC` must be set in `.env`. The CLI self-grants PoP on testnet when needed.

**Re-deploy from pre-built CAR (faster, skips merkleization):**

```bash
BULLETIN_RPC="wss://paseo-bulletin-next-rpc.polkadot.io" \
NODE_OPTIONS="--max-old-space-size=8192" \
bulletin-deploy --input-car dist.bulletin.car intran3t.dot --js-merkle
```

### Vercel

```bash
vercel --prod
```

---

## Key Files

```
src/
  providers/
    WalletProvider.tsx        # Wallet state, PAPI client, account mapping
  modules/
    profile/ProfileWidget.tsx # People Chain identity display
    forms/FormsWidget.tsx     # Form creation with auto account mapping
    forms/PublicForm.tsx      # Wallet-less public submission
    acc3ss/Acc3ssWidget.tsx   # NFT access pass minting
  hooks/
    useSubstrateEVMSigner.ts  # Substrate wallet EVM signing
    useAccountMapping.ts      # Mapping check and trigger
    useFormsContract.ts       # FormsV2 contract interactions
  lib/
    bulletin-storage.ts       # Bulletin upload/fetch
    forms-encryption.ts       # AES-256-GCM encryption
    wallet-provider.ts        # Extension detection utilities
  pages/
    Landing.tsx               # Wallet connect entry
    ModularDashboard.tsx      # Main dashboard
    AdminFormResults.tsx      # Response viewing and decryption
```

---

## Resources

- [Polkadot Docs](https://docs.polkadot.com/)
- [PAPI Docs](https://papi.how/)
- [Product SDK](https://github.com/novasamatech/product-sdk)
- [People Chain](https://wiki.polkadot.network/docs/learn-people-chain)
- [Bulletin Deploy](https://github.com/paritytech/bulletin-deploy)
- [Paseo Faucet](https://faucet.polkadot.io/)

---

MIT License. Copyright (c) 2026 Dennis Schiessl / Parity Technologies.
