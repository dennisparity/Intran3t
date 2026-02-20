# Statement Store Issue - Resolution Summary

**Date:** 2026-01-29
**Status:** ✅ Fixed (reverted to localStorage)
**Impact:** Forms now work, but only on same device

---

## What Happened

### The Error
```
[error] Failed to write to form-schema: Statement store error: Store is full.
```

### Root Cause
1. **Wrong storage choice:** Statement store is designed for **ephemeral session data** (like WebRTC signaling), not permanent form storage
2. **Testnet limitation:** PoP TestNet statement store reached capacity
3. **Architectural mismatch:** We copied web3-meet's approach without understanding the use case difference

### Why web3-meet Works
- ✅ Uses statement store for **WebRTC signaling** (presence, offers, answers)
- ✅ Data is **temporary** (users leave → data deleted)
- ✅ **High-frequency writes** (presence every 30s)
- ✅ **Ephemeral by design**

### Why dForms Failed
- ❌ Used statement store for **permanent forms**
- ❌ Data should be **persistent** (forms live forever)
- ❌ **Low-frequency writes** (create once, read many)
- ❌ **Wrong tool for the job**

---

## Current Solution

### ✅ localStorage Only (Working Now)

**Changes Made:**
1. Disabled statement store publishing in `FormsWidget.tsx`
2. Disabled statement store loading in `PublicForm.tsx`
3. Forms save/load from localStorage only

**Test It:**
```bash
# Intran3t (localhost:5173)
1. Refresh browser
2. Create form → saves to localStorage
3. Copy link
4. Open in SAME browser (not incognito) → works!
5. Open in incognito → "Form not found" (expected)
```

**Console Output:**
```
✓ Form saved to localStorage: form-xxx
  Creator: [Your Wallet Address]
⚠️ Statement store disabled (testnet capacity reached)
```

---

## Proper Solution: System Remarks

### What You Should Use

According to your storage strategy (from CLAUDE.md):

| Storage Type | Use Case | Status |
|--------------|----------|--------|
| **System Remarks** | Permanent small data (form schemas) | ❌ Not implemented yet |
| **Bulletin Chain** | 2-week temp storage (form responses) | ❌ Not implemented yet |
| **Statement Store** | Ephemeral sessions (NOT forms!) | ✅ Correctly avoiding |

### Implementation Roadmap

**Phase 1: localStorage (Current)**
- ✅ Works today
- ✅ Zero setup
- ❌ Same-device only

**Phase 2: System Remarks + Backend (Recommended)**
```typescript
// Form creation (creator pays gas)
await api.tx.system.remark(formJson).signAndSend(creatorWallet)

// Form response (backend pays gas for wallet-less users)
POST /api/submit-response → backend.signAndSend(BACKEND_WALLET)
```

**Benefits:**
- ✅ True decentralization
- ✅ Cross-device access
- ✅ Permanent storage
- ✅ Wallet-less UX preserved (backend sponsors gas)

**Timeline:** 2-4 weeks to implement

---

## Standalone dForms Project

**Location:** `/Users/dennisschiessl/Claude Code/dforms`

This project also uses statement store. You have two options:

### Option 1: Disable Now (Quick)
Update `dforms` to use localStorage only (same fix as Intran3t)

### Option 2: Implement System Remarks (Better)
Use standalone project as testbed for System Remarks implementation

**Recommendation:** Start with Option 1 (works immediately), then implement System Remarks in standalone project as proof-of-concept before bringing to Intran3t.

---

## Key Learnings

### ✅ Do
- Use **System Remarks** for permanent small data
- Use **Bulletin Chain** for temporary large data
- Use **Statement Store** for ephemeral coordination (like web3-meet)
- Match storage type to data lifecycle

### ❌ Don't
- Use statement store for permanent data
- Copy architectures without understanding use case
- Assume testnet = production (capacity limits!)

---

## Next Steps

### Immediate (Done ✅)
- [x] Disable statement store in Intran3t
- [x] Document issue and solution
- [x] Forms working with localStorage

### Short-term (Your Choice)
- [ ] Test localStorage approach (works for MVP)
- [ ] OR start System Remarks implementation
- [ ] Update standalone dforms project

### Long-term (Production)
- [ ] Implement System Remarks for form schemas
- [ ] Build backend API for gas sponsorship
- [ ] Use Bulletin Chain for large responses
- [ ] Full decentralization with wallet-less UX

---

## Documentation Created

1. **STORAGE_STRATEGY.md** - Complete implementation guide for System Remarks
2. **ARCHITECTURE.md** - Dual identity model explanation
3. **This file** - Issue summary and resolution

---

## Questions?

- **Q:** Will localStorage work for production?
  **A:** Only if users access forms on same device. Not ideal for sharing.

- **Q:** When should I implement System Remarks?
  **A:** When you need cross-device access or true decentralization.

- **Q:** What about gas fees?
  **A:** Backend sponsorship (recommended) or faucet integration (testnet only).

- **Q:** Can I use statement store for anything?
  **A:** Yes! Just not for permanent data. Perfect for temporary coordination.

---

**Status:** dForms works with localStorage. Statement store removed. Ready for System Remarks when you're ready to implement true decentralization.
