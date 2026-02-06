# dForms Storage Strategy

## Current Issue: Statement Store Full ❌

**Error:** `Statement store error: Store is full.`

**Root Cause:** Statement store on PoP TestNet has reached capacity. This is a **testnet limitation**.

## Why Statement Store Was Wrong Choice

From Polkadot storage hierarchy:

| Storage Type | Design Purpose | Our Attempted Use | Result |
|--------------|---------------|-------------------|--------|
| **Statement Store** | Ephemeral session data (WebRTC signaling) | Form storage | ❌ Store full, wrong tool |
| **System Remarks** | Permanent small data (proofs, metadata) | ❌ Not implemented | ✅ Correct choice |
| **Bulletin Chain** | 2-week temp storage (large files) | ❌ Not implemented | Could work |

**Lesson:** Statement store is for **temporary coordination** (like web3-meet's peer discovery), NOT permanent data storage!

---

## Current Solution: localStorage Only

### Status: ✅ Working (Temporary)

**Implementation:**
- Forms saved to browser localStorage
- Responses saved to browser localStorage
- Works immediately, zero blockchain dependency
- No gas fees, no testnet limits

**Limitations:**
- ❌ Only accessible on device where created
- ❌ Not decentralized
- ❌ Can't share forms across devices/browsers
- ❌ Data lost if cookies cleared

**Code:**
```typescript
// FormsWidget.tsx - Form creation
saveForms(updatedForms) // localStorage only
console.log('✓ Form saved to localStorage')
console.warn('⚠️ Statement store disabled (testnet capacity)')

// PublicForm.tsx - Form loading
const localForms = loadForms() // localStorage only
if (!foundForm) {
  setError('Forms can only be accessed on the device where they were created.')
}
```

---

## Proper Solution: System Remarks 🎯

### What Are System Remarks?

System Remarks (`system.remark` extrinsic) store small data permanently in block extrinsics:
- ✅ Permanent on-chain storage
- ✅ Decentralized (part of blockchain history)
- ✅ No "store full" errors
- ✅ Appropriate for form metadata
- ⚠️ Requires gas fees (users need tokens)

### Architecture

```
Form Creator (Typink Wallet)
    │
    ├─ Has tokens (can pay gas) ✓
    │
    ▼
Submit system.remark extrinsic
    │
    ├─ Payload: JSON form schema
    ├─ Cost: ~0.001 DOT per form
    │
    ▼
Stored in block permanently
    │
    ▼
Anyone can read (query blocks)
```

### Implementation Plan

**1. Form Creation (Creator pays gas):**
```typescript
import { createClient } from '@polkadot/api'

async function publishFormToChain(form: Form, creatorWallet: Signer) {
  const api = await createClient(...)

  // Encode form as hex
  const formJson = JSON.stringify({
    formId: form.id,
    title: form.title,
    fields: form.fields,
    creator: creatorWallet.address
  })
  const remarkData = `dforms:${formJson}`

  // Submit system.remark extrinsic
  const tx = api.tx.system.remark(remarkData)
  await tx.signAndSend(creatorWallet)

  // Wait for finalization
  console.log('✓ Form stored on-chain at block:', blockHash)
}
```

**2. Form Loading (Anyone can read):**
```typescript
async function loadFormFromChain(formId: string) {
  const api = await createClient(...)

  // Query blocks for remark containing formId
  // This requires indexing or scanning blocks
  const blocks = await api.rpc.chain.getBlock()

  // Parse extrinsics for system.remark
  for (const ext of block.extrinsics) {
    if (ext.method.section === 'system' && ext.method.method === 'remark') {
      const data = ext.args[0].toUtf8()
      if (data.startsWith(`dforms:`) && data.includes(formId)) {
        return JSON.parse(data.replace('dforms:', ''))
      }
    }
  }
}
```

**3. Form Responses (Responder needs tokens OR sponsorship):**

Option A: **Responder pays** (requires faucet integration)
```typescript
// Auto-fund wallet from faucet before submission
await fundFromFaucet(autoWallet.address, 0.001) // DOT
await submitResponseRemark(response, autoWallet)
```

Option B: **Backend sponsorship** (recommended)
```typescript
// Backend service pays gas on behalf of users
POST /api/submit-response
{
  formId: "form-xxx",
  answers: {...},
  signature: "0x..." // User signs, backend submits
}

// Backend:
await api.tx.system.remark(responseData).signAndSend(backendWallet)
```

---

## Recommended Implementation: Hybrid Approach

### Phase 1: localStorage (Current) ✅
- **Status:** Implemented
- **Use:** Development, testing, MVP
- **Limit:** Same-device only

### Phase 2: System Remarks + Backend Sponsorship 🎯
- **Timeline:** 2-4 weeks
- **Architecture:**
  ```
  Form Creator → System Remark (pays gas) → On-chain
  Form Filler → Backend API → Backend pays gas → On-chain
  ```
- **Benefits:**
  - True decentralization
  - Wallet-less UX preserved
  - Forms accessible anywhere

### Phase 3: Bulletin Chain (Optional)
- **Use Case:** Large form responses (file uploads, long text)
- **Timeline:** Future
- **Benefit:** 2-week auto-delete for privacy

---

## Gas Fee Economics

### Testnet (PoP)
- Free faucet tokens available
- Gas = ~0.001 PAS per form

### Mainnet (Polkadot)
- Gas = ~0.001 DOT per form (~$0.005 USD)
- Backend sponsorship needed for wallet-less users

### Cost Analysis
| Action | Who Pays | Cost | Solution |
|--------|----------|------|----------|
| Create form | Form creator | 0.001 DOT | Creator has wallet + tokens |
| Submit response | Form filler | 0.001 DOT | Backend sponsors OR faucet |

**Backend Sponsorship Budget:**
- $100 sponsors ~20,000 form submissions
- Scalable for production

---

## Migration Path

### Step 1: Keep localStorage (Done ✅)
```typescript
// Current implementation - works today
saveForms(forms) // localStorage
```

### Step 2: Add System Remarks (Future)
```typescript
// Dual-write for migration
saveForms(forms) // localStorage backup
await publishFormRemark(form, wallet) // On-chain primary
```

### Step 3: Backend API (Future)
```typescript
// api/forms/submit.ts
export async function POST(req: Request) {
  const { formId, answers, signature } = await req.json()

  // Verify signature
  if (!verifySignature(answers, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Backend pays gas
  await api.tx.system.remark(responseData).signAndSend(BACKEND_WALLET)

  return Response.json({ success: true })
}
```

### Step 4: Remove localStorage (Future)
```typescript
// Once System Remarks stable, remove localStorage
await loadFormFromChain(formId) // On-chain only
```

---

## Reference: web3-meet

**Why web3-meet uses statement store:**
- ✅ Ephemeral WebRTC signaling (correct use!)
- ✅ Session-based (users leave → data deleted)
- ✅ High-frequency writes (presence heartbeat every 30s)
- ✅ No permanent storage needed

**Why dForms should NOT:**
- ❌ Forms are permanent (not ephemeral)
- ❌ Low-frequency writes (create once, read many)
- ❌ Need cross-device access
- ❌ Statement store fills up with permanent data

---

## Action Items

### Immediate (Done ✅)
- [x] Disable statement store
- [x] Use localStorage only
- [x] Update error messages
- [x] Document issue

### Short-term (Next 2-4 weeks)
- [ ] Implement System Remarks for form storage
- [ ] Build backend API for gas sponsorship
- [ ] Add faucet integration for testnet
- [ ] Test on-chain storage

### Long-term (Future)
- [ ] Bulletin Chain for large responses
- [ ] Response encryption (only creator decrypts)
- [ ] Indexer for fast form queries
- [ ] Migrate existing forms to on-chain

---

## Resources

- [System Remarks Pallet](https://paritytech.github.io/polkadot-sdk/master/pallet_system/)
- [Polkadot Storage Guide](https://wiki.polkadot.network/docs/build-storage)
- [Your Storage Guide](/.claude/storage-guide.md)
