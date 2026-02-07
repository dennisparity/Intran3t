# DotNS Deployment Findings

> Created: 2026-02-06
> Status: Prototype phase - Bulletin integration blocked

## What We Built

✅ **Complete:**
- Automated build system (`npm run build` → `dist/`)
- IPFS CAR file creation from build output
- CID generation for content addressing
- Test account generation with mnemonic
- Domain name validation (8+ chars, 2 trailing digits)
- Deployment script skeleton

✅ **Working:**
```bash
npm run deploy:dotns
```
Output:
- Build: `/Users/dennisschiessl/Claude Code/Intran3t/dist`
- CAR: `/Users/dennisschiessl/Claude Code/Intran3t/dist.car` (5.58 MB)
- CID: `bafybeibydtq2c7pqfh3drqsdrnkkq7h4tkbszwyciqwy4nwfidpxrra5he`

## Discovery: Bulletin Chain Authorization Requirement

### The Problem

**Bulletin chain requires governance authorization before storing content.**

From [Polkadot Bulletin Chain documentation](https://github.com/paritytech/polkadot-bulletin-chain):

> Data is added via the `transactionStorage.store` extrinsic, **provided the storage of the data is authorized by root call.**

### Authorization Methods

Two pathways exist:

1. **Account-based**: `transactionStorage.authorize_account(account)`
   - Requires: Root/governance call
   - Effect: Authorizes specific account to store any content

2. **Preimage-based**: `transactionStorage.authorize_preimage(hash)`
   - Requires: Root call via PoP chain bridge
   - Effect: Authorizes specific content (by Blake2B hash)
   - Workflow:
     1. PoP chain root calls `authorize_preimage` (over bridge)
     2. User submits data via `transactionStorage.store` (over bridge)

### Why This Blocks Us

- ❌ Test accounts cannot directly store content without prior authorization
- ❌ Authorization requires governance approval or PoP chain integration
- ❌ system.remark() was wrong approach (caused WASM trap error)
- ✅ This is **by design** to prevent spam on Bulletin chain

## What This Means for DotNS Deployment

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DotNS Deployment (Full Implementation)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. BUILD                                                    │
│     ├─ npm run build → dist/                ✅ WORKS        │
│     └─ CAR file creation                    ✅ WORKS        │
│                                                              │
│  2. CONTENT STORAGE                                          │
│     ├─ Bulletin: transactionStorage.store   ❌ BLOCKED      │
│     │  (requires authorization)                             │
│     ├─ Public IPFS: pinning services        ⏭️ ALTERNATIVE  │
│     └─ IPFS Gateway: ipfs.io, dweb.link     ⏭️ ALTERNATIVE  │
│                                                              │
│  3. DOMAIN REGISTRATION                                      │
│     ├─ Paseo Asset Hub                      ⏭️ TODO         │
│     ├─ DOTNS_REGISTRAR_CONTROLLER.commit()  ⏭️ TODO         │
│     ├─ DOTNS_REGISTRAR_CONTROLLER.register()⏭️ TODO         │
│     └─ DOTNS_CONTENT_RESOLVER.setContenthash() ⏭️ TODO      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### IPFS Gateway Limitation

**Issue**: Content added to local IPFS node is not automatically available on public gateways.

```bash
# Local IPFS (works)
ipfs add -r dist/ --wrap-with-directory
→ CID: bafybeibydtq2c7pqfh3drqsdrnkkq7h4tkbszwyciqwy4nwfidpxrra5he

# Public gateway (403 - not found)
curl https://ipfs.io/ipfs/bafybeibydtq2c7pqfh3drqsdrnkkq7h4tkbszwyciqwy4nwfidpxrra5he
→ 403 Forbidden
```

**Why**: Public IPFS gateways only serve content that:
1. Has been pinned to their infrastructure, OR
2. Is discoverable via DHT and retrievable from peers, OR
3. Has been explicitly requested and cached

**Solution**: Use pinning services (Pinata, Web3.Storage, etc.) to publish content to public IPFS network.

## Three Paths Forward

### Option 1: Wait for Bulletin Authorization (Official)

**Pros:**
- Follows official Polkadot architecture
- Content stored on Bulletin chain (decentralized, permanent)
- Integrated with PoP chain

**Cons:**
- Requires governance approval OR PoP bridge integration
- Timeline unknown
- Complex implementation

**Steps:**
1. Submit governance proposal to authorize test account
2. Or integrate PoP chain bridge for preimage authorization
3. Implement TransactionStorage.store with 1MB chunking
4. Complete DotNS contract integration

### Option 2: Use Public IPFS (Practical Alternative)

**Pros:**
- Can implement immediately
- Standard IPFS tooling
- Works with existing DotNS contenthash format

**Cons:**
- Requires pinning service (costs or rate limits)
- Less integrated with Polkadot ecosystem
- Content persistence depends on pinning service

**Steps:**
1. Sign up for Pinata/Web3.Storage
2. Upload CAR file to pinning service
3. Get public IPFS CID
4. Implement DotNS contract integration (Paseo Asset Hub)
5. Set contenthash on domain resolver

### Option 3: Continue with Vercel (Simplest)

**Pros:**
- Already working
- No additional infrastructure
- Fast, reliable CDN
- Free tier available

**Cons:**
- Centralized hosting
- Not using Polkadot native storage

**Status:**
- Current deployment: `vercel` or `vercel --prod`
- Works perfectly for prototype phase

## Recommended Next Steps

### Phase 1: Implement DotNS Contracts (Paseo Asset Hub)

**Can do now** — This part doesn't depend on Bulletin:

1. **Add DotNS contract ABIs**
   - DOTNS_REGISTRAR
   - DOTNS_REGISTRAR_CONTROLLER
   - DOTNS_CONTENT_RESOLVER
   - POP_ORACLE

2. **Implement commit-reveal registration**
   ```javascript
   // Step 1: Commit
   const commitment = makeCommitment(name, owner, secret)
   await controller.commit(commitment)

   // Step 2: Wait (commit delay)
   await sleep(60000) // 60 seconds

   // Step 3: Register
   await controller.register(name, owner, duration, secret)
   ```

3. **Implement contenthash setting**
   ```javascript
   const contenthash = '0xe301' + Buffer.from(cid).toString('hex')
   await resolver.setContenthash(node, contenthash)
   ```

4. **Test with existing IPFS CID**
   - No need to upload to Bulletin yet
   - Use local/public IPFS for testing
   - Verify contenthash resolution works

### Phase 2: Choose Content Storage Strategy

After DotNS contracts work, decide:

**A. Wait for Bulletin authorization** (long-term, official)
- Best for production Polkadot-native apps
- Requires patience

**B. Use IPFS pinning service** (medium-term, practical)
- Good balance of decentralization and practicality
- Can migrate to Bulletin later

**C. Continue with Vercel** (short-term, pragmatic)
- Fine for current prototype phase
- Can always migrate later

## Test Account Details

**Mnemonic:**
```
practice valve connect shaft snow sail allow wheat business sense stick accuse
```

**Address (Substrate):**
```
5FEonLrpC8HMUW9UZR9RZmCSq7v4nQvPan3cvjGxM9LvRxk2
```

**Get PAS tokens:**
- Faucet: https://faucet.polkadot.io/
- Needed for: Paseo Asset Hub transactions (domain registration)
- NOT needed for: Local build/CAR creation

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `scripts/deploy-dotns.js` | Main deployment script | ✅ Working (Phases 1-2 skip Bulletin) |
| `scripts/generate-test-account.js` | Generate test mnemonics | ✅ Working |
| `.env` | Added DotNS config | ✅ Configured |
| `.env.example` | DotNS documentation | ✅ Documented |
| `dist.car` | IPFS CAR file | ✅ Generated (5.58 MB) |

## Environment Variables

```bash
# Added to .env and .env.example
DOTNS_MNEMONIC="your twelve word mnemonic..."
DOTNS_DOMAIN=intran3t-test42
BULLETIN_RPC=wss://bulletin.dotspark.app
PASEO_ASSETHUB_RPC=wss://passet-hub-paseo.ibp.network
IPFS_GATEWAY=https://ipfs.dotspark.app
```

## References

- [Polkadot Bulletin Chain](https://github.com/paritytech/polkadot-bulletin-chain)
- [DotNS Documentation](https://dotid.app/) (assumption - need official docs)
- [IPFS CAR Format](https://ipld.io/specs/transport/car/)
- Polkadot Faucet: https://faucet.polkadot.io/

## Conclusion

**What we learned:**
- ✅ Build and CAR creation workflow is solid
- ❌ Bulletin requires governance authorization
- ✅ IPFS CID generation works perfectly
- ⏭️ DotNS contract integration is the next logical step

**Current recommendation:**
1. **Implement DotNS contracts on Paseo Asset Hub** (can do now)
2. **Test with IPFS pinning service** (Pinata free tier)
3. **Migrate to Bulletin** once authorization is available

This gives us a working end-to-end DotNS deployment with a clear migration path to Bulletin when ready.
