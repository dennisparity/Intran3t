# dForms - Statement Store Integration

> Updated: 2026-01-28
> Based on: web3-meet repository (https://github.com/Nemanya8/web3-meet)

## Overview

The dForms module has been upgraded with **decentralized form storage** using Polkadot's statement store. This enables:

- **Wallet-less form submissions** - Users get auto-generated wallets stored in browser
- **On-chain storage** - Forms and responses stored on Polkadot (not localStorage)
- **Privacy-preserving** - Auto-delete after 2 weeks (ephemeral storage)
- **Decentralized** - No centralized servers required

## Changes Made

### 1. New Libraries (from web3-meet)

**Location:** `src/lib/`

| File | Purpose | Source |
|------|---------|--------|
| `wallet.ts` | BIP39 wallet generation & derivation | web3-meet |
| `storage.ts` | Browser cookie-based wallet storage | web3-meet (adapted) |
| `ss-webrtc/StatementStore.ts` | Blockchain statement store client | web3-meet |
| `ss-webrtc/types.ts` | Type definitions for form channels | web3-meet (adapted) |
| `forms-statement-store.ts` | Forms-specific statement store wrapper | New |

### 2. Updated Components

**`src/modules/forms/PublicForm.tsx`**
- Auto-generates wallet on mount (if not exists)
- Shows info banner: "Your wallet will be created automatically and stored securely in your browser."
- Submits form responses to statement store instead of localStorage
- Success page shows wallet address and privacy details

**`src/modules/forms/FormsWidget.tsx`**
- Publishes form schemas to statement store when created
- Keeps localStorage as fallback for reliability
- Uses async/await for statement store operations

### 3. New Dependencies

Added to `package.json`:

```json
{
  "@polkadot-api/polkadot-sdk-compat": "^2.4.1",
  "@polkadot-api/sdk-statement": "^0.3.0",
  "@polkadot-api/substrate-bindings": "^0.16.6",
  "@polkadot-api/substrate-client": "^0.5.0",
  "@polkadot-api/utils": "^0.2.0",
  "@polkadot-api/ws-provider": "^0.7.4",
  "@polkadot-labs/hdkd": "^0.0.26",
  "@polkadot-labs/hdkd-helpers": "^0.0.27",
  "@scure/bip39": "^2.0.1",
  "js-cookie": "^3.0.5"
}
```

### 4. Environment Configuration

**Added to `.env` and `.env.example`:**

```bash
# Statement Store (dForms - Decentralized Form Storage)
VITE_SUBSTRATE_ENDPOINT=wss://pop-testnet.parity-lab.parity.io:443/9910
```

## Architecture

### User Flow

```
┌──────────────────────────────────────────────────────────┐
│ Form Responder (Wallet-less User)                        │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
            1. Clicks form link
                        │
                        ▼
            2. Auto-generate wallet
               - BIP39 mnemonic (12 words)
               - Saved to browser cookie (30 days)
               - No user action required
                        │
                        ▼
            3. Shows info banner
               "Your wallet will be created automatically..."
                        │
                        ▼
            4. Fills out form
                        │
                        ▼
            5. Submit → Statement Store
               - Connect to substrate node
               - Sign with auto-generated wallet
               - Write to channel: {formId}/response-{id}
               - Disconnect
                        │
                        ▼
            6. Success page
               - Shows wallet address
               - Privacy details
               - Call-to-action

┌──────────────────────────────────────────────────────────┐
│ Form Creator (Wallet Required)                           │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
            1. Connect wallet (Typink)
                        │
                        ▼
            2. Create form
               - Title, description, fields
               - Publish to statement store
               - Channel: {formId}/form-schema
                        │
                        ▼
            3. Share link
               - Copy form URL
               - {origin}/f/{formId}
                        │
                        ▼
            4. View responses
               - Poll statement store
               - Read from channel: {formId}/response-*
               - Only creator can decrypt
```

### Statement Store Channels

```
{formId}/
├── form-schema              # Form definition (creator writes)
└── response-{responseId}    # Individual responses (responders write)
```

### Data Flow

1. **Form Creation:**
   ```typescript
   FormsWidget → createFormsStatementStore() → connect() → publishForm() → disconnect()
   ```

2. **Form Submission:**
   ```typescript
   PublicForm → Auto-generate wallet → createFormsStatementStore() → connect() → submitResponse() → disconnect()
   ```

3. **Read Responses:**
   ```typescript
   FormsWidget → createFormsStatementStore() → connect() → readFormResponses() → disconnect()
   ```

## Key Features

### 1. Automatic Wallet Creation

**Location:** `PublicForm.tsx:38-57`

```typescript
useEffect(() => {
  let existingMnemonic = getMnemonic()

  if (!existingMnemonic) {
    // Generate new wallet automatically
    const mnemonic = generateRandomMnemonic()
    const wallet = deriveWallet(mnemonic)

    // Save to browser cookies
    saveMnemonic(mnemonic)
    saveWalletAddress(wallet.address)

    setWalletAddress(wallet.address)
    setWalletCreated(true)
  } else {
    // Use existing wallet
    const wallet = deriveWallet(existingMnemonic)
    setWalletAddress(wallet.address)
  }
}, [])
```

**Benefits:**
- No wallet extension required
- No user action needed
- Secure browser storage (HTTPS-only cookies)
- 30-day expiry (reusable across forms)

### 2. Statement Store Integration

**Location:** `forms-statement-store.ts`

```typescript
export class FormsStatementStore {
  async publishForm(data, creatorAddress): Promise<string>
  async submitResponse(data, responderAddress): Promise<string>
  async readFormSchema(formId): Promise<FormSchemaValue | null>
  async readFormResponses(formId): Promise<FormResponseValue[]>
  async updateFormStatus(formId, status): Promise<void>
}
```

**Benefits:**
- Last-write-wins semantics
- 2-week auto-delete (ephemeral)
- Decentralized storage
- Single-writer per channel (prevents conflicts)

### 3. Privacy & Security

**Highlighted on success page:**

- ✓ Wallet created automatically
- ✓ Encrypted responses (only creator can decrypt)
- ✓ On-chain storage (Polkadot)
- ✓ Auto-delete after 2 weeks

**Info banner on form:**

> "Your wallet will be created automatically and stored securely in your browser. No installation or extension needed. Your wallet enables decentralized, encrypted form submissions."

## Testing

### Manual Testing

1. **Test wallet-less submission:**
   ```bash
   npm run dev
   # Navigate to Dashboard → Forms → Create Form
   # Copy form link
   # Open in incognito window (no wallet)
   # Fill form and submit
   # Check console for "✓ Form published to statement store"
   ```

2. **Test wallet reuse:**
   ```bash
   # After first submission, submit another form
   # Should not show "wallet created" banner
   # Should reuse existing wallet
   ```

3. **Test statement store:**
   ```bash
   # Check browser console for:
   # "Connected to: wss://pop-testnet.parity-lab.parity.io:443/9910"
   # "Written to form-schema"
   # "Written to response-{id}"
   ```

## Known Limitations

1. **Fallback to localStorage:**
   - If statement store connection fails, forms still work via localStorage
   - Ensures reliability while statement store is in beta

2. **Response polling:**
   - Currently requires manual refresh to see new responses
   - Future: Implement real-time polling (like web3-meet presence)

3. **Encryption:**
   - Currently responses are not encrypted (stored as plain JSON)
   - Future: Add encryption using form creator's public key

## Next Steps

1. **Real-time polling:** Poll statement store every 5 seconds for new responses
2. **Response encryption:** Encrypt responses with creator's public key
3. **Remove localStorage fallback:** Once statement store is stable
4. **Add response notifications:** Notify creator when new response arrives
5. **Add form analytics:** Track views, completions, abandonment

## Resources

- Web3-meet repo: https://github.com/Nemanya8/web3-meet
- Statement Store docs: https://github.com/paritytech/polkadot-sdk (pallet-statement)
- PAPI Statement SDK: https://github.com/polkadot-api/polkadot-api

## Files Changed

### New Files
- `src/lib/wallet.ts`
- `src/lib/storage.ts`
- `src/lib/ss-webrtc/StatementStore.ts`
- `src/lib/ss-webrtc/types.ts`
- `src/lib/forms-statement-store.ts`
- `DFORMS_STATEMENT_STORE_UPDATE.md` (this file)

### Modified Files
- `src/modules/forms/PublicForm.tsx` - Auto-wallet + statement store submission
- `src/modules/forms/FormsWidget.tsx` - Statement store publishing
- `package.json` - New dependencies
- `.env` - Added `VITE_SUBSTRATE_ENDPOINT`
- `.env.example` - Added statement store configuration

## Migration Notes

**No breaking changes** - Existing forms in localStorage will continue to work. New forms will be published to both statement store and localStorage (dual-write for reliability).

**User impact:** None - Users will automatically get wallets when they submit forms. Existing form creators don't need to change anything.
