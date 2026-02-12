# DotNS Asset Loading Fix - Implementation Guide

> **Date:** 2026-02-12
> **Status:** ✅ Fix Implemented
> **Issue:** Assets fail to load (HTTP 500) from paseo.li gateway
> **Solution:** Use ipfsCid (original directory structure) instead of storageCid (CAR chunks DAG)

---

## The Problem

**Symptom:** After successful DotNS deployment, the root page loads but assets return HTTP 500 errors.

**Example:**
- ✅ `https://intran3t-app42.paseo.li/` → HTTP 200 (HTML loads)
- ❌ `https://intran3t-app42.paseo.li/assets/index-CBwU4fPO.css` → HTTP 500
- ❌ `https://intran3t-app42.paseo.li/assets/index-BhVU0qzW.js` → HTTP 500

**Working reference:**
- ✅ `https://amateurdentistry00.paseo.li/` → Fully functional with assets

---

## Root Cause Analysis

### What We Were Doing (WRONG)

```
1. ipfs add -r dist/           → ipfsCid (bafybei...)
2. ipfs dag export {ipfsCid}   → dist.car file
3. Chunk CAR file (1.5MB each) → chunks[]
4. Store chunks on Bulletin    → chunk CIDs
5. Create DAG-PB root of chunks → storageCid
6. Set contenthash to storageCid ← PROBLEM
```

**Issue:** We created a **double-wrapped DAG structure**:

```
storageCid (DAG-PB root of CAR chunks)
  ├─ chunk1.raw (bytes 0-1.5MB of CAR file)
  ├─ chunk2.raw (bytes 1.5-3MB of CAR file)
  └─ chunk3.raw (bytes 3-4.2MB of CAR file)
```

This is NOT traversable like a directory:
```
ipfsCid (original directory DAG)
  ├─ index.html
  ├─ assets/
  │   ├─ index.css
  │   └─ index.js
  └─ favicon.png
```

**When gateway tries to fetch `storageCid/assets/index.css`:**
1. Gateway decodes contenthash → gets `storageCid`
2. Queries IPFS for `storageCid/assets/index.css`
3. `storageCid` DAG only contains `chunk1, chunk2, chunk3` blocks (RAW codec)
4. Path `/assets/index.css` doesn't exist in this DAG structure
5. Gateway returns HTTP 500

---

## Team Feedback (2026-02-12)

From issue tracker discussion with the team:

**✅ What's Working:**
1. dweb-proxy-api (gateway resolution) works correctly
2. Local dweb gateway works: `https://intran3t-app42.dot.localhost/`
3. Contenthash encoding is valid (ENSIP-7 format)
4. CID decodes correctly
5. Content accessible on dweb.link: `https://dweb.link/ipfs/{cid}`
6. Gateway resolution logic is correct

**⚠️ The Actual Issue:**
> "Content is a CAR file, not original directory structure"

**❌ paseo.li Gateway:**
> "Can't fetch from Bulletin correctly (yet) - when Bulletin Chain gets its shit together"

**Recommended Workflow:**
```
1. Get CID from IPFS (original directory)
2. Use dotns-sdk CLI to set contenthash with IPFS CID
3. This makes {name}.paseo.li work
4. Eventually when Bulletin Chain integration matures, use Bulletin CID
```

---

## The Fix (Implemented 2026-02-12)

### Changes to `scripts/deploy.js`

**1. Use ipfsCid for contenthash** (lines 353-358):

```javascript
// TEAM RECOMMENDATION (2026-02-12): Use ipfsCid until paseo.li gateway's Bulletin integration matures
// Gateway resolution works correctly, but Bulletin fetching not yet stable
// Future: Switch to storageCid when "Bulletin Chain gets its shit together" (team quote)
const cidForContenthash = ipfsCid || cid; // Prefer ipfsCid (original IPFS directory structure)
console.log(`   Using CID for contenthash: ${cidForContenthash} ${ipfsCid ? '(ipfsCid - original directory)' : '(fallback)'}`);
const contenthashHex = `0x${encodeContenthash(cidForContenthash)}`;
```

**2. Enable IPFS pinning** (line 261):

```javascript
// Changed from --pin=false to --pin=true
const cid = execSync(
  `ipfs add -Q -r --cid-version=1 --raw-leaves --pin=true "${directoryPath}"`,
  { encoding: "utf-8" }
).trim();
```

**3. Add helpful logging** (lines 263-265, 307-308):

```javascript
// In merkleize():
console.log(`   IPFS CID: ${cid} (pinned to local node)`);
console.log(`   ⚠️  IMPORTANT: Content must be available on public IPFS network`);
console.log(`   Verify: https://dweb.link/ipfs/${cid}`);

// In deploy():
console.log(`   Storage CID (Bulletin DAG): ${cid}`);
console.log(`   IPFS CID (original directory): ${ipfsCid}`);
```

---

## Deployment Instructions

### Prerequisites

1. **IPFS CLI installed**
   ```bash
   # macOS
   brew install ipfs

   # Verify
   ipfs version
   ```

2. **IPFS daemon running** (for pinning)
   ```bash
   ipfs daemon &
   ```

3. **Environment variables configured**
   ```bash
   # .env
   DOTNS_MNEMONIC="your twelve word mnemonic"
   DOTNS_DOMAIN=intran3t-app42
   BULLETIN_RPC=wss://bulletin.dotspark.app
   PASEO_ASSETHUB_RPC=wss://sys.ibp.network/asset-hub-paseo
   ```

### Deploy

```bash
cd ~/Claude\ Code/Intran3t

# Build
npm run build

# Deploy (full flow: storage + registration + contenthash)
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:dotns
```

**Expected output:**
```
============================================================
Storage
============================================================

   Mode: Directory
   Path: /Users/dennisschiessl/Claude Code/Intran3t/dist
   Merkleizing: /Users/dennisschiessl/Claude Code/Intran3t/dist
   IPFS CID: bafybei... (pinned to local node)
   ⚠️  IMPORTANT: Content must be available on public IPFS network
   Verify: https://dweb.link/ipfs/bafybei...
   CAR: 5.58 MB

   Connecting to Bulletin: wss://bulletin.dotspark.app
   Chunks: 4
   Total: 5585.69 KB

   Storing 4 chunks...
   [1/4]
      codec: 0x55, hash: 0x12
      CID: bafkrei... (finalized)
   [2/4]
      codec: 0x55, hash: 0x12
      CID: bafkrei... (finalized)
   [3/4]
      codec: 0x55, hash: 0x12
      CID: bafkrei... (finalized)
   [4/4]
      codec: 0x55, hash: 0x12
      CID: bafkrei... (finalized)

   Building DAG-PB...
   Storing root node...
   Root CID: bafybei... (finalized)

   Storage CID (Bulletin DAG): bafybei...
   IPFS CID (original directory): bafybei...

============================================================
Dotns
============================================================
   Domain: intran3t-app42.dot
   Domain intran3t-app42.dot is already owned by you!
   Using CID for contenthash: bafybei... (ipfsCid - original directory)
   Setting contenthash...
   Transaction hash: 0x...
   Contenthash set successfully!

============================================================
DEPLOYMENT COMPLETE!
============================================================
   Domain: intran3t-app42.dot
   URL: https://intran3t-app42.paseo.li
   URL: https://intran3t-app42.bigtava.online
============================================================
```

### Verify Deployment

```bash
# 1. Check root page
curl -I https://intran3t-app42.paseo.li/
# Expected: HTTP/2 200

# 2. Get asset filenames
curl https://intran3t-app42.paseo.li/ | grep -o 'assets/[^"]*'
# Example output:
# assets/index-CBwU4fPO.css
# assets/index-BhVU0qzW.js

# 3. Check CSS
curl -I https://intran3t-app42.paseo.li/assets/index-CBwU4fPO.css
# Expected: HTTP/2 200

# 4. Check JS
curl -I https://intran3t-app42.paseo.li/assets/index-BhVU0qzW.js
# Expected: HTTP/2 200

# 5. Verify content on public IPFS
curl -I https://dweb.link/ipfs/bafybei.../
# Expected: HTTP/2 200
```

### Browser Test

1. Visit `https://intran3t-app42.paseo.li`
2. Open browser console
3. Check for:
   - ✅ No HTTP 500 errors
   - ✅ Styling applied (CSS loaded)
   - ✅ JavaScript executes (JS loaded)
   - ✅ Navigation works

---

## Important Notes

### IPFS Public Network Availability

**Content must be accessible on public IPFS network.**

**Why:** The paseo.li gateway needs to fetch content from public IPFS, not just your local node.

**How to ensure availability:**

1. **Pin to local node** (already done by deploy script):
   ```bash
   ipfs pin add bafybei...
   ```

2. **Connect to public IPFS swarm:**
   ```bash
   ipfs daemon &
   ```

3. **Verify public accessibility:**
   ```bash
   curl -I https://dweb.link/ipfs/{your-cid}/
   # Should return HTTP/2 200
   ```

4. **Optional: Use public pinning service** (for guaranteed availability):
   - [Pinata](https://pinata.cloud/) - Free tier available
   - [Web3.Storage](https://web3.storage/) - Free with sign-up
   - [NFT.Storage](https://nft.storage/) - Free for NFTs

---

## Long-Term Solution

### When Bulletin Integration Matures

Once paseo.li gateway properly integrates with Bulletin chain:

1. **Switch back to storageCid:**
   ```javascript
   // In scripts/deploy.js
   const cidForContenthash = cid; // Use storageCid (Bulletin)
   ```

2. **OR: Use SDK's block-by-block storage:**
   - Store each IPFS block individually on Bulletin
   - Root CID references original directory structure
   - No CAR file chunks (see plan for full implementation)

3. **No dependency on public IPFS:**
   - Content stored natively on Bulletin
   - Gateway fetches directly from Bulletin
   - Fully decentralized within Polkadot ecosystem

---

## Troubleshooting

### Assets still return HTTP 500

**Check 1: Contenthash uses ipfsCid**
```bash
# Query on-chain contenthash
cast call 0x7756DF72CBc7f062e7403cD59e45fBc78bed1cD7 \
    "contenthash(bytes32)(bytes)" \
    $(cast namehash "intran3t-app42.dot") \
    --rpc-url https://services.polkadothub-rpc.com/testnet

# Decode the contenthash
# Should match ipfsCid from deployment logs
```

**Check 2: Content accessible on public IPFS**
```bash
curl -I https://dweb.link/ipfs/{ipfsCid}/assets/index.css
# Must return HTTP/2 200
```

**Check 3: IPFS daemon running**
```bash
ipfs swarm peers
# Should show connected peers
```

### Content not on public IPFS

**Solution: Re-pin and announce**
```bash
# Re-pin
ipfs pin add {ipfsCid}

# Force DHT announce
ipfs dht provide {ipfsCid}

# Wait 1-2 minutes for propagation
sleep 120

# Verify
curl -I https://dweb.link/ipfs/{ipfsCid}/
```

### Update contenthash only

If you already deployed and just need to update contenthash:

```bash
# Set environment variable with your ipfsCid
export IPFS_CID="bafybei..."

# Re-run deployment (skips storage, only updates contenthash)
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:dotns
```

---

## References

- **Gateway Issue Tracker:** [GitHub Issue #XXX] (team confirmation of root cause)
- **dweb-proxy-api:** `~/dweb-proxy-api` (gateway resolution implementation)
- **dotns-sdk:** `~/dotns-sdk` (CLI for contenthash operations)
- **ENSIP-7 Standard:** https://docs.ens.domains/ens-improvement-proposals/ensip-7-contenthash-field
- **IPFS Pinning:** https://docs.ipfs.tech/how-to/pin-files/

---

## Summary

**Before Fix:**
- Contenthash pointed to `storageCid` (CAR chunks DAG)
- Gateway couldn't traverse nested paths
- Assets returned HTTP 500

**After Fix:**
- Contenthash points to `ipfsCid` (original directory structure)
- Gateway can traverse nested paths via IPFS
- All assets load correctly

**Trade-off:**
- ✅ Works now with public IPFS
- ⏳ Bulletin storage still happens (for future migration)
- 🎯 Clear path to full Bulletin integration when ready

**Status:** ✅ Production-ready for current phase
