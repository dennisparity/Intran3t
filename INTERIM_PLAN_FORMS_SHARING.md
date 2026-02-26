# Interim Plan: Forms Sharing & Permission System

**Created:** 2026-02-25
**Status:** On hold until post-holidays
**Delete this file:** Once polished plan is created and work begins

---

## TL;DR

Forms sharing is broken (colleague gets "form not found" when accessing `/admin/forms/7`). Solution: Add session key architecture + on-chain permission system inspired by hackm3. Two-level management: global `/admin/users` page + per-form permissions.

---

## Current Problem

**Issue:** Sharing form results link fails
**Example:** `https://intran3t.vercel.app/#/admin/forms/7` → "Form not found"

**Root Cause:**
- AdminFormResults.tsx only searches localStorage for forms
- Colleague's localStorage is empty
- App doesn't fetch form definition from on-chain (even though it exists there)
- PublicForm.tsx (voter view) already solves this correctly by fetching from Bulletin

**What's stored on-chain:**
```
FormsV2 Contract (0xe2F988c1aD2533F473265aCD9C0699bE47643316):
- formCids[7] = "bafybei..." (points to Bulletin)
- responseCids[7] = ["bafybei...", "bafybei..."]
- formCreators[7] = creator's wallet address
```

**Missing:**
- Permission system (who else can view)
- Encrypted key sharing (how to decrypt responses)
- Cross-device form loading (fetch from on-chain)

---

## Solution Architecture (Inspired by HackM3)

### Core Concept: Session Keys

**What is a session key?**
- Autonomous signing agent derived from one mnemonic (stored in localStorage)
- Generates dual keypairs: SR25519 (Substrate) + Secp256k1 (EVM)
- One-time wallet funding → session key pays all future gas fees
- No wallet popups after setup → better UX

**How it enables sharing:**
1. Users register public encryption keys on-chain
2. Form creator encrypts form key per recipient (asymmetric encryption)
3. Encrypted shares stored on-chain: `mapping(formId => mapping(user => encryptedShare))`
4. Recipient fetches + decrypts with their private key
5. Session key submits transactions autonomously (no popups)

**Three access modes:**
1. **Session Key** (best UX): Contract checks `msg.sender == registeredSessionKey`
2. **Link-Based**: Signature verification (for public sharing)
3. **Permission-Based**: Direct wallet signing (fallback)

### Reference Implementation

**HackM3 Repo:** `/Users/dennisschiessl/hackm3`

**Key files:**
- Session key core: `frontend/src/lib/session-key.ts`
- Contract: `evm/src/DocumentAccessManagement.sol`
- Integration: `frontend/src/lib/dam.ts`
- Registration: `frontend/src/lib/account.ts`

**Permission levels in hackm3:**
```
NONE (0) < VIEW (1) < COMMENT (2) < EDIT (3) < ADMIN (4)
```

**For Intran3t forms:**
```
NONE (0) < VIEW (1) < ADMIN (2)
```

---

## Proposed Architecture for Intran3t

### 1. Session Key Manager (Frontend)

**File to create:** `src/lib/session-key-manager.ts`

```typescript
interface SessionKey {
  ss58Address: string           // Substrate account
  h160Address: string            // EVM address
  privateKey: string             // EVM private key
  encryptionPublicKey: string    // For receiving encrypted shares
  encryptionPrivateKey: string   // For decrypting shares
}

class SessionKeyManager {
  generate()           // Create new mnemonic + derive keypairs
  get()               // Retrieve from localStorage
  registerOnChain()   // Fund + register keys in contract
  getSigner()         // Get PolkadotSigner for transactions
}
```

**Storage:**
- Mnemonic in localStorage: `intran3t:session:mnemonic`
- Never store private keys directly (derive from mnemonic on demand)

### 2. FormsAccessV2 Contract (Solidity)

**File to create:** `contracts/solidity/FormsAccessV2.sol`

**State variables:**
```solidity
// User keys
mapping(address => UserKeys) public userKeys;
struct UserKeys {
  bytes32 encryptionPublicKey;
  address sessionKey;
  uint64 registeredAt;
}

// Permissions
mapping(uint256 => mapping(address => AccessGrant)) private _permissions;
struct AccessGrant {
  Permission level;  // NONE, VIEW, ADMIN
  uint64 expiresAt;  // 0 = never expires
  uint64 grantedAt;
}

// Encrypted form keys (one per recipient)
mapping(uint256 => mapping(address => bytes)) public encryptedFormKeys;

// Global roles
enum GlobalRole { USER, MODERATOR, ADMIN }
mapping(address => GlobalRole) public globalRoles;
```

**Key functions:**
```solidity
// User setup
registerKeys(encryptionPublicKey, sessionKey)

// Form management (existing)
registerForm(cid) → formId
submitResponse(formId, cid)
getFormCid(formId) → cid
getResponseCids(formId) → cid[]

// Permission management (NEW)
grantAccess(formId, user, permission, expiresAt, encryptedFormKey)
revokeAccess(formId, user)
hasAccess(formId, user, requiredLevel) → bool

// Global roles (NEW)
setGlobalRole(user, role)
isGlobalAdmin(user) → bool
```

**Contract address:** TBD (deploy to Paseo AssetHub after implementation)

### 3. Frontend Components

#### A. `/admin/users` Page (Global Management)

**File to create:** `src/pages/AdminUsers.tsx`

**Features:**
- Table view of all users
- Columns: Name, Address, Global Role, Session Key Status, Forms Created, Shared Forms
- Role dropdown: USER / MODERATOR / ADMIN
- "View Permissions" button → per-user form access list
- Stats cards: Total Users, Admins, Session Keys, Total Forms

**Who can access:**
- Only global admins (checked via `isGlobalAdmin()` contract call)

#### B. Form-Level Permissions

**File to modify:** `src/pages/AdminFormResults.tsx`

**Add:**
- "Manage Access" button in header
- Permission panel showing authorized users
- Add user dialog (search by address or identity)
- Grant access: VIEW or ADMIN, optional expiration
- Revoke access button per user

**Flow:**
1. Admin clicks "Manage Access"
2. Sees list of authorized users (fetch from contract)
3. Clicks "Add User" → search modal
4. Selects user, permission level, expiration
5. Frontend:
   - Gets recipient's public encryption key
   - Encrypts form key with recipient's public key
   - Calls `grantAccess()` with encrypted share
6. Recipient can now:
   - View form at `/admin/forms/7`
   - Fetch encrypted share from contract
   - Decrypt with their private key
   - Decrypt responses

---

## Implementation Phases

### Phase 1: Quick Fix (Immediate, before full solution)

**Goal:** Enable cross-device viewing without permissions (temporary)

**Changes:**
- Modify `AdminFormResults.tsx` lines 38-54
- Add fallback to fetch form from Bulletin if not in localStorage
- Copy logic from `PublicForm.tsx` lines 71-97

**Code:**
```typescript
// In AdminFormResults.tsx
if (!found && isNumericId) {
  const cid = await getFormCid(Number(formId))
  const bytes = await fetchRawFromBulletin(cid)
  const formDef = JSON.parse(new TextDecoder().decode(bytes))
  // Build Form object from formDef
}
```

**Result:** Colleague can see form + encrypted responses, but cannot decrypt (no key)

**Workaround for decryption:** Share URL with key fragment:
```
https://intran3t.vercel.app/#/admin/forms/7#key=BASE64_KEY
```

### Phase 2: Session Key Foundation (Week 1-2)

**Tasks:**
1. Create `src/lib/session-key-manager.ts`
2. Add session key setup flow:
   - Generate mnemonic
   - Derive SR25519 + Secp256k1 keypairs
   - Generate encryption keypair (X25519 or similar)
   - Store mnemonic in localStorage
3. Add setup UI: "Setup Session Key" modal on first login
4. Fund session key from wallet (10 PAS)
5. Map session key to EVM address (Revive.map_account)

### Phase 3: Contract Development (Week 2-3)

**Tasks:**
1. Write `FormsAccessV2.sol` (based on hackm3's DocumentAccessManagement)
2. Deploy to Paseo AssetHub
3. Update `.env` with new contract address
4. Create `useFormsAccessContract.ts` hook
5. Migrate existing forms to new contract (or support both contracts)

### Phase 4: User Key Registration (Week 3)

**Tasks:**
1. Add `registerKeys()` function to contract hook
2. Registration flow after session key setup:
   - Extract encryption public key
   - Call `registerKeys(encryptionPublicKey, sessionKeyAddress)`
   - Store confirmation in localStorage
3. Add "Session Key Status" indicator in UI

### Phase 5: Permission System (Week 4-5)

**Tasks:**
1. Implement encrypted key sharing:
   - Asymmetric encryption library (libsodium or similar)
   - `encryptFormKey(formKey, recipientPublicKey)`
   - `decryptFormKey(encryptedShare, recipientPrivateKey)`
2. Add `grantAccess()` / `revokeAccess()` to contract hook
3. Build permission panel in `AdminFormResults.tsx`
4. Test end-to-end sharing flow

### Phase 6: Global User Management (Week 5-6)

**Tasks:**
1. Create `/admin/users` page
2. Aggregate user data:
   - Discovered users (localStorage)
   - People Chain identities
   - Contract events (KeysRegistered, FormRegistered)
3. Build user table with role management
4. Add per-user permission view (all forms they have access to)

### Phase 7: Integration & Testing (Week 6-7)

**Tasks:**
1. Add permission checks in AdminFormResults before showing responses
2. Auto-fetch encrypted share and decrypt if user has access
3. Show "No access" message if permission denied
4. Test scenarios:
   - Creator shares with colleague (VIEW)
   - Colleague views + decrypts responses
   - Creator revokes access → colleague sees "No access"
   - Time-limited access expires
   - Global admin can view all forms

---

## File Structure (After Implementation)

```
src/
├── lib/
│   ├── session-key-manager.ts       ← NEW: Session key generation + management
│   ├── encryption.ts                ← NEW: Asymmetric encryption helpers
│   └── forms-encryption.ts          ← EXISTING: AES-256-GCM for responses
├── hooks/
│   ├── useFormsAccessContract.ts    ← NEW: FormsAccessV2 contract hook
│   └── useFormsContract.ts          ← EXISTING: Current FormsV2 hook (keep for migration)
├── pages/
│   ├── AdminUsers.tsx               ← NEW: Global user management
│   ├── AdminFormResults.tsx         ← MODIFY: Add permission panel
│   └── Admin.tsx                    ← MODIFY: Link to /admin/users
└── components/
    ├── SessionKeySetup.tsx          ← NEW: Setup modal
    └── PermissionPanel.tsx          ← NEW: Reusable permission UI

contracts/solidity/
├── FormsAccessV2.sol                ← NEW: Permission + encrypted sharing
├── FormsV2.sol                      ← EXISTING: Keep for backward compat
└── scripts/
    └── deploy-forms-access.mjs      ← NEW: Deployment script
```

---

## Key Design Decisions

### 1. Two-Level Permission Architecture

**Global level (`/admin/users`):**
- Platform-wide roles: USER, MODERATOR, ADMIN
- Global admins can access all forms
- Moderators can view but not delete
- Users have no special privileges

**Form level (`/admin/forms/{id}`):**
- Per-form permissions: VIEW, ADMIN
- VIEW: Can see + decrypt responses
- ADMIN: Can manage permissions + all VIEW privileges
- Time-limited access supported (expiresAt)

### 2. Encryption Strategy

**Form responses (existing):**
- AES-256-GCM symmetric encryption
- Key stored in creator's localStorage
- Same key for all responses to a form

**Form key sharing (NEW):**
- Asymmetric encryption per recipient
- Each user gets encrypted copy of form key
- Only recipient can decrypt (has private key)
- Stored on-chain in contract

### 3. Migration Strategy

**Option A: Dual contract support**
- Keep FormsV2 (0xe2F988...) for existing forms
- Use FormsAccessV2 for new forms
- Frontend checks which contract based on formId range

**Option B: Migration script**
- Deploy FormsAccessV2
- Migrate all existing forms on-chain
- Update localStorage to point to new contract
- Deprecate FormsV2

**Recommendation:** Option A (safer, no data migration risk)

---

## Environment Variables (After Implementation)

```bash
# Add to .env
VITE_FORMS_ACCESS_CONTRACT_ADDRESS=0x...  # FormsAccessV2 address (TBD)

# Keep existing
VITE_FORMS_CONTRACT_ADDRESS=0xe2F988c1aD2533F473265aCD9C0699bE47643316
VITE_ASSETHUB_EVM_RPC=https://eth-rpc-testnet.polkadot.io
VITE_ASSETHUB_EVM_CHAIN_ID=420420417
```

---

## Testing Checklist (Post-Implementation)

### Session Key Setup
- [ ] Generate session key on first login
- [ ] Fund session key from wallet (10 PAS)
- [ ] Register keys on-chain
- [ ] Verify session key can submit transactions
- [ ] Check localStorage stores mnemonic securely

### Permission Management
- [ ] Creator can grant VIEW access to colleague
- [ ] Colleague receives encrypted form key on-chain
- [ ] Colleague can decrypt form key
- [ ] Colleague can view + decrypt responses
- [ ] Creator can revoke access → colleague sees "No access"
- [ ] Time-limited access expires after deadline

### Global User Management
- [ ] `/admin/users` only accessible to global admins
- [ ] User table loads all platform users
- [ ] Role changes persist on-chain
- [ ] Session key status reflects registration state

### Cross-Device Sharing
- [ ] Share `/admin/forms/7` link
- [ ] Colleague's device fetches form from Bulletin
- [ ] If has permission, fetches encrypted share
- [ ] Decrypts share and responses
- [ ] If no permission, shows "No access" message

---

## Known Issues / Edge Cases

### 1. Creator Loses Encryption Key

**Problem:** Creator's localStorage cleared → can't decrypt responses
**Solutions:**
- Backup mnemonic during setup (show recovery phrase)
- Export form key to file (encrypted with password)
- Store encrypted backup on-chain (future enhancement)

### 2. Session Key Runs Out of Funds

**Problem:** Session key balance drops below threshold
**Solutions:**
- Check balance before transactions
- Show "Low balance" warning in UI
- Auto-fund from wallet if balance < 1 PAS

### 3. Recipient Changes Device

**Problem:** Session key on device A, recipient tries to access on device B
**Solutions:**
- Import mnemonic on device B (recovery flow)
- Or use wallet signing fallback (permission-based mode)

### 4. Form Definition Updates

**Problem:** Form definition on Bulletin is immutable (CID-based)
**Current behavior:** Edits create new local version, on-chain CID unchanged
**Future:** Allow form updates with new CID + version tracking

---

## Next Steps (Post-Holidays)

1. **Review this document** and hackm3 repo
2. **Decide on quick fix vs full solution**:
   - Quick fix = Phase 1 only (1-2 hours)
   - Full solution = All phases (6-7 weeks)
3. **Create polished implementation plan** in CLAUDE.md
4. **Delete this file** once work begins
5. **Start with Phase 1 or Phase 2** depending on urgency

---

## References

### Code Files (Current State)

| File | Purpose | Issue |
|------|---------|-------|
| `src/pages/AdminFormResults.tsx` | Form results dashboard | Only searches localStorage (lines 38-54) |
| `src/modules/forms/PublicForm.tsx` | Voter form view | Works correctly (fetches from on-chain, lines 71-97) |
| `src/hooks/useFormsContract.ts` | FormsV2 contract hook | Missing permission functions |
| `src/lib/bulletin-storage.ts` | Bulletin upload/fetch | Complete, works |
| `contracts/solidity/FormsV2.sol` | Current contract | No permissions, no encrypted shares |

### HackM3 Reference Files

| File | Purpose |
|------|---------|
| `hackm3/frontend/src/lib/session-key.ts` | Session key manager (single source of truth) |
| `hackm3/evm/src/DocumentAccessManagement.sol` | Permission + encrypted sharing contract |
| `hackm3/frontend/src/lib/dam.ts` | Contract integration layer |
| `hackm3/frontend/src/lib/account.ts` | 3-step registration flow |
| `hackm3/frontend/src/lib/document-keys.ts` | Encryption key helpers |

### Useful Patterns from HackM3

```typescript
// Check if session key or wallet signing
const activeSigner = sessionKey
  ? await sessionKeyManager.getSigner()
  : walletSigner

// Verify session key in contract
function _verifySessionKey(address expectedOwner) internal view {
  require(
    msg.sender == userKeys[expectedOwner].sessionKey,
    "Invalid session key"
  );
}

// Encrypt share for recipient
const recipientKey = await contract.getUserKeys(recipientAddress)
const encryptedShare = await encrypt(
  formKey,
  recipientKey.encryptionPublicKey
)
await contract.grantAccessWithShare(
  formId,
  recipientAddress,
  encryptedShare
)
```

---

## Contact & Questions (Post-Holidays)

When picking this up:
1. Re-read this document top to bottom
2. Review hackm3 session key implementation
3. Check if FormsV2 contract needs urgent fixes (quick fix = Phase 1)
4. If building full solution, start with Phase 2 (session key foundation)
5. Update CLAUDE.md with polished plan
6. Delete this file

**Repo:** `/Users/dennisschiessl/Claude Code/Intran3t`
**HackM3 Reference:** `/Users/dennisschiessl/hackm3`

---

**Document Status:** Interim plan for post-holidays pickup
**Delete after:** Creating polished plan + starting implementation
**Last Updated:** 2026-02-25
