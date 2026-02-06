# dForms Architecture - Dual Identity Model

## The Problem

**Intran3t requires wallet connection:**
- Users connect via Typink (wallet extension)
- On-chain identity required for all features
- Wallet extension doesn't expose mnemonic (security by design)

**Statement Store requires mnemonic:**
- Needs mnemonic to sign statements
- Can't use wallet extension directly
- Technical requirement of @polkadot-api/sdk-statement

## The Solution: Dual Identity

### 1. User Identity (Typink Wallet)
**What:** Connected wallet address from Typink
**Used for:**
- Form creator field
- Access control
- On-chain identity verification
- Intran3t permissions

**Example:**
```typescript
creator: connectedAccount.address  // e.g., "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
```

### 2. Statement Store Signing Key (Auto-Generated)
**What:** Auto-generated mnemonic stored in browser
**Used for:**
- Signing statement store writes (technical requirement)
- Publishing forms to blockchain
- Submitting responses

**Example:**
```typescript
const mnemonic = getMnemonic() || generateRandomMnemonic()
await store.connect(mnemonic, formId)  // Uses mnemonic for signing
await store.publishForm({...}, connectedAccount.address)  // Uses wallet address as creator
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Form Creator (Logged into Intran3t)                         │
└─────────────────────────────────────────────────────────────┘
            │
            ├─── Identity: Typink Wallet (5Grw...GKutQY)
            │    └─ Used for: Creator field, permissions, identity
            │
            └─── Statement Store Key: Auto-generated mnemonic
                 └─ Used for: Signing blockchain writes
                        │
                        ▼
                 Statement Store Write
                 {
                   creator: "5Grw...GKutQY",  ← User's real wallet
                   signed_by: derived_from_mnemonic  ← Technical key
                 }
```

## Why This Works

1. **User Perspective:**
   - Single wallet (Typink)
   - No second wallet needed
   - Identity tied to their main wallet

2. **Technical Perspective:**
   - Statement store gets required mnemonic
   - Form creator = user's wallet address
   - Transparent to user

3. **Security:**
   - User's main wallet never exposed
   - Statement store key is single-purpose
   - Can't access main wallet funds

## Form Responders (Wallet-less)

For users submitting forms (no Intran3t login):

```
Form Responder
    │
    └─── Auto-generated wallet (12-word mnemonic)
         ├─ Identity: Generated address
         ├─ Signing: Same mnemonic
         └─ Stored in browser cookies
```

## Code Implementation

### Form Creation (FormsWidget.tsx)
```typescript
// User's identity (Typink wallet)
const creator = connectedAccount.address

// Statement store signing key (auto-generated)
let mnemonic = getMnemonic()
if (!mnemonic) {
  mnemonic = generateRandomMnemonic()
  saveMnemonic(mnemonic)
}

// Publish to statement store
await store.connect(mnemonic, formId)  // Sign with mnemonic
await store.publishForm({...}, creator)  // Creator = Typink wallet
```

### Form Submission (PublicForm.tsx)
```typescript
// Form responder gets auto-generated wallet
const mnemonic = getMnemonic() || generateRandomMnemonic()
const wallet = deriveWallet(mnemonic)

// Submit response
await store.connect(mnemonic, formId)
await store.submitResponse({...}, wallet.address)
```

## Comparison: web3-meet

web3-meet uses a similar pattern:

| Aspect | web3-meet | dForms |
|--------|-----------|--------|
| **User Identity** | Username (registered on-chain) | Typink wallet address |
| **Signing Key** | Auto-generated mnemonic | Auto-generated mnemonic |
| **Registration** | Backend API pays gas | No registration needed |
| **Statement Store** | WebRTC signaling | Form storage |

## Benefits

✅ **Seamless UX** - Users don't know about the technical key
✅ **Secure** - Main wallet never exposed
✅ **Blockchain Native** - All data on statement store
✅ **Identity Preserved** - Form creator = Typink wallet address
✅ **Wallet-less Friendly** - Form responders get auto wallets

## Limitations

⚠️ **Browser-bound** - Statement store key in browser cookies
⚠️ **Multi-device** - Each device gets different signing key (but same creator identity)
⚠️ **Key Loss** - Clearing cookies = can't publish more forms (but existing forms still work)

## Future Improvements

1. **Backend Service Key** - Central signing key (like web3-meet username registration)
2. **Deterministic Derivation** - Derive signing key from wallet signature
3. **Multi-device Sync** - Sync signing key across devices
