# Production Deployment Guide

This guide walks you through deploying Intran3t to production.

## Prerequisites

- [x] Deploy RBAC smart contract to Asset Hub mainnet
- [x] Configure wallet support for mainnet
- [x] Test all features on testnet first
- [ ] Set up domain name (optional)
- [ ] Configure analytics (optional)

---

## Step 1: Deploy Smart Contract to Mainnet

Before deploying the frontend, you need to deploy the RBAC smart contract to Asset Hub mainnet.

```bash
cd contracts/solidity

# Deploy to Asset Hub Mainnet
npx hardhat run scripts/deploy.js --network assetHubMainnet
```

**Save the deployed contract address** - you'll need it for environment variables.

---

## Step 2: Configure Environment Variables

### Option A: Using Vercel (Recommended)

1. **Copy `.env.production` template:**
   ```bash
   cp .env.example .env.production
   ```

2. **Edit `.env.production`:**
   ```env
   VITE_NETWORK=mainnet
   VITE_RBAC_CONTRACT_ADDRESS=<YOUR_MAINNET_CONTRACT_ADDRESS>
   ```

3. **Set in Vercel Dashboard:**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.production`
   - Set Environment to "Production"

### Option B: Using Netlify

Similar process in Netlify Dashboard → Site Settings → Environment Variables

---

## Step 3: Build for Production

Test the production build locally first:

```bash
# Build the app
npm run build

# Preview the production build
npm run preview
```

**Check for:**
- No console errors
- Correct network (mainnet)
- Contract interactions work
- All features functional

---

## Step 4: Deploy to Vercel (Recommended)

### First-time Setup

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

   Follow prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? `intran3t` (or your choice)
   - Directory? `./`
   - Override settings? **N**

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Subsequent Deployments

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## Step 5: Configure Custom Domain (Optional)

In Vercel Dashboard:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Step 6: Post-Deployment Checklist

- [ ] Test wallet connection on production URL
- [ ] Create test organization
- [ ] Issue test credentials
- [ ] Verify People Chain identity lookup works
- [ ] Test registry search
- [ ] Check all admin functions
- [ ] Test on mobile devices
- [ ] Verify analytics (if enabled)

---

## Deployment Platforms

### Vercel (Recommended) ✅

**Pros:**
- Zero-config deployment
- Serverless functions (for API proxy)
- Auto SSL/HTTPS
- Preview deployments
- Edge network (fast globally)

**Deploy:**
```bash
vercel --prod
```

### Netlify

**Pros:**
- Similar to Vercel
- Edge functions support
- Great for static sites

**Deploy:**
```bash
npm run build
netlify deploy --prod --dir=dist
```

### IPFS (Decentralized)

**Pros:**
- Truly decentralized
- Censorship resistant

**Cons:**
- No serverless functions (API proxy won't work)
- Need alternative solution for dotid.app proxy

**Deploy:**
```bash
npm run build
npx ipfs-deploy dist
```

**Note:** For IPFS, you'll need to modify `dotid-registry.ts` to use a CORS-enabled proxy service or run your own backend.

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_NETWORK` | Network mode | `mainnet` or `testnet` |
| `VITE_RBAC_CONTRACT_ADDRESS` | Deployed RBAC contract | `0x123...` |
| `VITE_ASSETHUB_EVM_CHAIN_ID` | Asset Hub chain ID | `0x3E8` (mainnet) |
| `VITE_ASSETHUB_EVM_RPC` | Asset Hub RPC endpoint | `https://rpc.assethub.io` |
| `VITE_PEOPLE_CHAIN_RPC` | People Chain RPC | `wss://polkadot-people-rpc.polkadot.io` |
| `VITE_DOTID_API_URL` | DotID proxy endpoint | `/api/dotid-proxy` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `true` or `false` |

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Proxy Not Working

Verify `api/dotid-proxy.js` exists and Vercel is configured with `vercel.json`.

### Contract Interaction Fails

- Check contract address in environment variables
- Verify you're on correct network (mainnet vs testnet)
- Check wallet is connected to Asset Hub

### CORS Errors

Make sure you're using the serverless proxy (`/api/dotid-proxy`) instead of direct API calls.

---

## Monitoring & Analytics

### Vercel Analytics (Built-in)

Enable in Vercel Dashboard → Analytics

### Custom Analytics

Add to `.env.production`:
```env
VITE_ANALYTICS_ID=your-analytics-id
VITE_ENABLE_ANALYTICS=true
```

---

## Security Considerations

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use environment variables** for all secrets
3. **Audit smart contracts** before mainnet deployment
4. **Test thoroughly** on testnet first
5. **Enable rate limiting** for API endpoints (Vercel does this automatically)

---

## Rollback Strategy

If something goes wrong:

```bash
# Vercel: Deploy previous version
vercel rollback

# Or redeploy specific commit
git checkout <previous-commit>
vercel --prod
```

---

## Support

- **Documentation:** See README.md
- **Issues:** GitHub Issues
- **Community:** Polkadot Forum

---

## Quick Deploy Commands

```bash
# 1. Build and test locally
npm run build && npm run preview

# 2. Deploy to Vercel preview
vercel

# 3. If preview looks good, deploy to production
vercel --prod

# 4. Monitor deployment
vercel logs
```

Done! 🎉 Your app is now live in production.
