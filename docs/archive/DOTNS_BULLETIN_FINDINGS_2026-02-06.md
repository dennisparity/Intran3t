# DotNS + Bulletin Storage Investigation Findings

**Date:** 2026-02-11
**Status:** ✅ **RESOLVED** - Site now working at https://intran3t-app42.paseo.li

## THE SOLUTION (2026-02-11)

**Root Cause:** Incorrect contenthash encoding - must use `@ensdomains/content-hash` library

**The Fix:**
```bash
npm install @ensdomains/content-hash
```

```javascript
// scripts/deploy.js
import { encode as encodeContentHash } from "@ensdomains/content-hash";

export function encodeContenthash(cidString) {
  const encoded = encodeContentHash('ipfs', cidString); // Use 'ipfs' codec
  return encoded; // Returns hex without '0x' prefix
}
```

**Deployment:**
- Domain: `intran3t-app42.dot`
- CID: `bafybeiaoa55sadxdyn4dhbiaixzzfwsxorbkxq5gqtu4vozlwvuvs2opei`
- Tx: `0xed88d5ea35958a5cf07c83dd20529689f856fc8abdbe043a5ec7b21c590157e0`
- Live: https://intran3t-app42.paseo.li ✅

---

## Original Investigation (2026-02-11)

**Original Issue:** New deployments failed with HTTP 500 "Error fetching content from polkadot storage"

## Problem Statement

After updating the codebase with Address Converter module and fixing Vite config (`base: './'` for relative paths), deployments to DotNS fail. The contenthash is set successfully on-chain, but the gateway cannot fetch the content from Bulletin storage.

## Root Cause Analysis

### The Broken Workflow

Our current deployment process:

```bash
1. ipfs add -r dist/              # Creates IPFS CID on LOCAL node
2. ipfs dag export <cid> > dist.car  # Exports to CAR file
3. Chunk CAR file (1.5MB chunks)
4. Store chunks to Bulletin
5. Create DAG-PB root node
6. Set contenthash to IPFS CID from step 1
```

**The Fatal Flaw:**
- The IPFS CID (step 1) points to content on the **local IPFS node**
- Bulletin only has the **chunked CAR file data** (steps 3-5)
- Gateway tries to fetch IPFS CID → content doesn't exist on Bulletin → HTTP 500

### Code Location

**File:** `scripts/deploy.js`

**The Bug (Fixed):**
```javascript
// Line 308-309 (BEFORE FIX)
cid = result.storageCid;  // CID of chunked CAR on Bulletin
ipfsCid = result.ipfsCid;  // IPFS directory CID (local)

// Line 354 (BEFORE FIX)
const contenthashHex = `0x${encodeContenthash(cid)}`;  // Used storageCid ❌

// AFTER FIX:
const cidForContenthash = ipfsCid || cid;  // Use ipfsCid when available ✅
const contenthashHex = `0x${encodeContenthash(cidForContenthash)}`;
```

**Why the fix doesn't work:** Even using `ipfsCid` fails because that content isn't on Bulletin.

## Investigation: product-infrastructure Repository

**Location:** `~/product-infrastructure/examples/pop-dotns/`

### What They Have

1. **Single File Upload** (`src/bulletin/store.ts`)
   - `storeSingleToBulletin()` - Files < 8MB
   - `storeChunkedToBulletin()` - Chunked files with DAG-PB root
   - ✅ Works for individual files

2. **DotNS CLI** (`src/cli/commands/`)
   - `bulletin` - Upload single files
   - `content set <name> <cid>` - Set contenthash with existing CID
   - ❌ No directory/CAR upload command

3. **Code Comparison**
   - They use identical storage approach: chunks + DAG-PB root
   - Codecs: `0x55` (raw) for chunks, `0x70` (dag-pb) for root
   - Hash: `0x12` (sha2-256) for both
   - Same as our implementation ✅

### What They DON'T Have

- ❌ No CAR file handling
- ❌ No directory-to-Bulletin upload
- ❌ No IPFS directory structure storage
- ❌ No example of full static site deployment

## Hypothesis: How Old Deployment Worked

The Feb 7 deployment (`bafybeibm6rfptryqpmfvffd65qsw5xkuj2l3wwjodtj5ksjkff3hxf7rcy`) worked initially but:

1. May have been cached/pinned on IPFS network temporarily
2. Gateway might have had different behavior before
3. Content might have been on public IPFS network coincidentally

Current status: Old CID also returns HTTP 500/504 now.

## Missing Pieces

The product-infrastructure repository doesn't show:

1. How to deploy full static sites (directories) to DotNS
2. How to make IPFS directory structures work with Bulletin storage
3. Working examples of gateway-accessible content

## Possible Solutions

### Option 1: Individual File Upload (Untested)

Instead of CAR files, store each file individually:

```javascript
for (const file of allFilesInDist) {
  const cid = await storeSingleToBulletin(fileContent);
  mapping[filePath] = cid;
}
// Create index file with CID mappings
// Gateway serves files by looking up CIDs
```

**Cons:**
- Would need custom gateway support
- Doesn't match IPFS directory semantics
- Unclear if gateway supports this

### Option 2: Wait for Gateway Fix

The gateway might need updates to:
- Properly fetch CAR data from Bulletin
- Unpack IPFS directory structures
- Handle the contenthash → Bulletin → IPFS flow

### Option 3: Contact DotNS Team

This appears to be either:
- Missing documentation
- Incomplete feature implementation
- Gateway infrastructure issue

## Recommendations

1. **Short-term:** Use Vercel or traditional hosting
2. **Medium-term:** Contact DotNS/gateway operators about directory deployment
3. **Long-term:** Wait for official documentation/examples of static site deployment

## Files Changed in Investigation

- `scripts/deploy.js` - Fixed to use `ipfsCid` instead of `storageCid`
- `vite.config.mjs` - Added `base: './'` for relative paths
- `.papi/polkadot-api.json` - Reverted to `testnet-passet-hub.polkadot.io` for working descriptors

## Key Learnings

1. **PAPI Descriptor Requirements:** ReviveApi.address only exists on `testnet-passet-hub.polkadot.io` endpoint
2. **Vite Config:** Need `base: './'` for IPFS/DotNS deployments (relative paths)
3. **CID Types:** Must distinguish between:
   - IPFS directory CID (from `ipfs add`)
   - Bulletin storage CID (from chunked upload)
   - They are NOT interchangeable
4. **Gateway Limitations:** Current `paseo.li` gateway cannot fetch our content despite successful on-chain storage

## Status

**Blocked:** Cannot deploy to DotNS until gateway/infrastructure issue is resolved.

**Working:** Old version still loads (may be cached).

**Next Steps:** Document issue for DotNS team or implement alternative approach.
