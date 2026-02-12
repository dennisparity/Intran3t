# DotNS Deployment Guide

> **Last Updated:** February 12, 2026
> **Status:** Production Ready
> **Live Example:** https://amateurdentistry00.paseo.li/

Complete guide for deploying to Polkadot's decentralized web hosting via DotNS + Bulletin Chain.

---

## 🎯 Overview

**DotNS** provides decentralized domain names and content hosting on Polkadot:
- **Domains:** ENS-style `.dot` names stored on-chain (Paseo Asset Hub)
- **Content:** Files stored on Bulletin Chain, addressed via IPFS CIDs
- **Gateway:** Content served through `paseo.li` gateway with automatic resolution

**Architecture:**
```
Your App → Bulletin Chain (storage) → DotNS Contracts (domain registry) → paseo.li (gateway)
```

---

## 🚀 Quick Start: Manual Deployment (Current)

For Intran3t, we currently use manual deployment scripts. See [Manual Deployment](#-manual-deployment-currenttesting) section below.

**For future apps and reference**, the official GitHub Actions approach is documented in the next section.

---

## 📚 GitHub Actions Approach (Reference for Future Apps)

The **official approach** uses paritytech/dotns-sdk's reusable GitHub Actions workflow. This is provided as a reference for future deployments and when we're ready to deploy via Bulletin Chain natively.

### Step 1: Add GitHub Secret

Add your mnemonic to repository secrets:

1. Go to **Settings → Secrets → Actions**
2. Add secret: `DOTNS_MNEMONIC`
3. Value: Your 12-word mnemonic phrase

**Requirements:**
- Account must have PAS tokens for transaction fees
- Get from faucet: https://faucet.polkadot.io/

### Step 2: Create Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DotNS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  build:
    name: Build Site
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build application
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7

  deploy:
    name: Deploy to DotNS
    needs: [build]
    uses: paritytech/dotns-sdk/.github/workflows/deploy.yml@main
    with:
      basename: intran3t-app42          # Your domain (without .dot)
      artifact-name: dist               # Name from build job
      mode: ${{ github.event_name == 'push' && 'production' || 'preview' }}
      register-base: true               # Register if not owned
    secrets:
      mnemonic: ${{ secrets.DOTNS_MNEMONIC }}

  comment:
    name: Comment on PR
    needs: [deploy]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Post deployment URL
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: deploy-preview
          message: |
            ### 🚀 Deployed to DotNS
            **URL:** https://${{ needs.deploy.outputs.fqdn }}.paseo.li
            **Domain:** `${{ needs.deploy.outputs.fqdn }}`
            **CID:** `${{ needs.deploy.outputs.cid }}`
```

### Step 3: Push to GitHub

```bash
git add .github/workflows/deploy.yml
git commit -m "Add DotNS deployment workflow"
git push origin main
```

**Result:**
- **Push to main** → Deploys to `intran3t-app42.dot` (production)
- **Pull request** → Deploys to `pr<number>.intran3t-app42.dot` (preview)

---

## 📋 Domain Naming Rules

| Requirement | Details |
|-------------|---------|
| **Length** | 8+ characters total |
| **Suffix** | Exactly 2 trailing digits |
| **Characters** | Lowercase letters, digits, hyphens only |
| **Restrictions** | No leading/trailing hyphens |

**Examples:**
- ✅ `intran3t-app42` (11 chars, 2 digits)
- ✅ `my-project99` (12 chars, 2 digits)
- ❌ `app1` (too short, only 1 digit)
- ❌ `my-app` (no trailing digits)
- ❌ `MyApp42` (uppercase not allowed)

**Cost:**
- 8+ chars + 2 digits = **0.002 PAS** (no proof-of-personhood required)
- Shorter/base names require PoP verification

---

## 🛠️ Manual Deployment (Current/Testing)

**This is our current deployment method.** Used for local testing, development, and production deployments until we transition to native Bulletin Chain storage.

### Prerequisites

```bash
# 1. Install IPFS CLI
brew install ipfs

# 2. Start IPFS daemon
ipfs daemon &

# 3. Configure environment
cp .env.example .env
# Add DOTNS_MNEMONIC and DOTNS_DOMAIN
```

### Deploy Command

```bash
# Full deployment (build + storage + registration)
npm run build
npm run deploy:dotns

# Update contenthash only (if domain already registered)
node scripts/update-dotns.js <your-ipfs-cid>
```

### How It Works

Our manual scripts (`scripts/deploy.js`) handle:
1. **Build** → Creates `dist/` directory
2. **Merkleize** → IPFS creates directory DAG and generates CID
3. **Pin** → Content pinned to local IPFS node
4. **Register** → Domain registered on Paseo Asset Hub (if needed)
5. **Contenthash** → IPFS CID set on DotNS resolver

**Important:** Content must be available on public IPFS network. Pin to public IPFS gateway or use GitHub Actions approach (stores on Bulletin directly).

---

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```bash
# Domain Configuration
DOTNS_DOMAIN=intran3t-app42
DOTNS_MNEMONIC="your twelve word mnemonic phrase here"

# RPC Endpoints (defaults work for testnet)
PASEO_ASSETHUB_RPC=wss://sys.ibp.network/asset-hub-paseo
BULLETIN_RPC=wss://bulletin.dotspark.app

# Optional: Skip storage, use existing CID
IPFS_CID=bafybei...
```

### Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "deploy:dotns": "node scripts/deploy-nextjs.js",
    "update-contenthash": "node scripts/update-dotns.js"
  }
}
```

---

## 📦 Dependencies

### Required for Manual Deployment

```json
{
  "dependencies": {
    "@ensdomains/content-hash": "^3.1.0",
    "@ipld/car": "^5.3.2",
    "@ipld/dag-pb": "^4.1.3",
    "@polkadot-api/descriptors": "^0.16.1",
    "@polkadot-api/substrate-bindings": "^0.11.2",
    "@polkadot-labs/hdkd": "^1.0.0",
    "@polkadot-labs/hdkd-helpers": "^1.0.0",
    "ipfs-unixfs": "^11.1.4",
    "multiformats": "^13.3.1",
    "polkadot-api": "^1.10.0",
    "viem": "^2.21.54"
  }
}
```

### System Requirements

- **Node.js:** 20+ (manual deployment)
- **IPFS CLI:** Latest (manual deployment only)
- **GitHub Actions:** None (handles everything)

---

## ✅ Verification

After deployment, verify:

```bash
# 1. Root page
curl -I https://intran3t-app42.paseo.li/
# Expected: HTTP/2 200

# 2. Check assets
curl https://intran3t-app42.paseo.li/ | grep -o 'assets/[^"]*'

# 3. Test CSS
curl -I https://intran3t-app42.paseo.li/assets/index-[hash].css
# Expected: HTTP/2 200

# 4. Test JS
curl -I https://intran3t-app42.paseo.li/assets/index-[hash].js
# Expected: HTTP/2 200

# 5. Verify IPFS accessibility
curl -I https://dweb.link/ipfs/[your-cid]/
# Expected: HTTP/2 200
```

**Browser Test:**
1. Visit `https://your-domain.paseo.li`
2. Open DevTools → Network tab
3. Check: No 500 errors, all assets load, app functions correctly

---

## 🐛 Troubleshooting

### Assets Return HTTP 500

**Cause:** Contenthash points to non-traversable structure (CAR chunks instead of directory).

**Solution:** Use IPFS directory CID (ipfsCid), not Bulletin storage CID (storageCid).

Our scripts automatically use ipfsCid. GitHub Actions workflow handles this correctly.

### Domain Shows as "Not Registered"

**Cause:** Ownership check method may be unreliable.

**Solution:** Verify by testing live site. If `https://your-domain.paseo.li/` returns HTTP 200 with correct content, domain is registered.

### Content Not on Public IPFS

**Cause:** Local IPFS node not connected to public network.

**Solution:**
```bash
# Check peer connections
ipfs swarm peers

# Force DHT announce
ipfs dht provide [cid]

# Or use GitHub Actions (stores on Bulletin directly)
```

### Memory Errors During Manual Deployment

**Cause:** Large chain responses exceed Node.js heap limit.

**Solution:**
```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run deploy:dotns
```

### Transaction Fails with Revert Error

**Cause:** Domain already registered or insufficient funds.

**Solution:**
```bash
# Check balance
# Visit: https://polkadot.js.org/apps/?rpc=wss://sys.ibp.network/asset-hub-paseo#/accounts

# Use update script instead of full deploy
node scripts/update-dotns.js [new-cid]
```

---

## 🔄 Deployment Modes Comparison

| Aspect | GitHub Actions | Manual Scripts |
|--------|----------------|----------------|
| **Storage** | Bulletin Chain (native) | IPFS (requires public availability) |
| **Registration** | Automatic | Manual |
| **Preview Deploys** | Yes (PR subdomains) | No |
| **CI/CD** | Built-in | Manual |
| **Complexity** | Low (workflow config) | High (scripts + IPFS) |
| **Best For** | Future: Native Bulletin deployments | Current: Intran3t production |
| **Status** | Reference example | Active/In use |

**Current Status:** Intran3t uses manual deployment (works perfectly). GitHub Actions approach provided as reference for future apps and native Bulletin integration.

---

## 📚 Key Concepts

### IPFS CID vs Storage CID

- **ipfsCid:** Original IPFS directory structure (traversable, supports nested paths)
- **storageCid:** Bulletin CAR chunks DAG (not traversable by gateway)

**Use ipfsCid for contenthash** to ensure assets load correctly.

### Contenthash Format (ENSIP-7)

DotNS uses ENSIP-7 contenthash encoding:

```
0xe3 (IPFS namespace) + 0x01 (version) + CID bytes
```

Our scripts use `@ensdomains/content-hash` library (official, tested).

### Gateway Resolution

How `your-domain.paseo.li` works:

1. Gateway queries DotNS resolver for contenthash
2. Decodes contenthash → extracts IPFS CID
3. Fetches content from IPFS/Bulletin
4. Serves via CDN with path resolution

**Headers returned:**
```
x-content-path: /ipfs/[cid]/
x-content-storage-type: polkadot
```

---

## 🎯 Current Deployment Status

### Intran3t

- **Domain:** `intran3t-app42.dot`
- **URL:** https://intran3t-app42.paseo.li
- **CID:** `bafybeidj74ay4huaep73rrgofywumchlcidbqmgggwtso3i2dxsj55ci5q`
- **Status:** ✅ Fully functional
- **Deployment:** Manual (transitioning to GitHub Actions)
- **Owner:** `0x35cdb23ff7fc86e8dccd577ca309bfea9c978d20`

### Transactions

| Action | Transaction Hash |
|--------|-----------------|
| Registration | `0xf7332036e93d340c632676ae3842e7ad4f6fde8293ebd2fa1f4708037ce7ef2c` |
| Contenthash (latest) | `0x4d0dd3c967423642912af529574c5b1eaf2c109ed6b3170647a65d5fbc3736c2` |

---

## 🔗 References

- **Working Example:** https://github.com/andrew-ifrita/amateur_dentistry
- **Live Site:** https://amateurdentistry00.paseo.li/
- **DotNS SDK:** https://github.com/paritytech/dotns-sdk
- **Reusable Workflow:** `paritytech/dotns-sdk/.github/workflows/deploy.yml@main`
- **Faucet:** https://faucet.polkadot.io/
- **ENSIP-7 Spec:** https://docs.ens.domains/ens-improvement-proposals/ensip-7-contenthash-field

---

## 📝 Next Steps

### Transition to GitHub Actions

1. Create `.github/workflows/deploy.yml` (see Quick Start)
2. Add `DOTNS_MNEMONIC` secret to repository
3. Push workflow to GitHub
4. Test with pull request (preview deployment)
5. Merge to main (production deployment)

### Future: Bulletin Integration

Once paseo.li gateway's Bulletin integration matures:
- Switch from IPFS to native Bulletin storage
- No dependency on public IPFS network
- Fully decentralized within Polkadot ecosystem

**Current approach works perfectly** - gateway resolution is correct, just uses IPFS as content source.

---

**Questions?** Check troubleshooting section or examine the working example at https://github.com/andrew-ifrita/amateur_dentistry
