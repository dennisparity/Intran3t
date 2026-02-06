# Vercel Deployment Guide - Quick Start

## Prerequisites

- [x] Node.js installed
- [x] Git repository (optional but recommended)
- [ ] Vercel account (free - create at vercel.com)

---

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

---

## Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate.

---

## Step 3: Test Build Locally

Before deploying, make sure everything builds correctly:

```bash
# Build the app
npm run build

# Preview the build locally
npm run preview
```

Visit http://localhost:4173 and verify:
- ✅ App loads
- ✅ Wallet connection works
- ✅ Admin panel accessible
- ✅ No console errors

---

## Step 4: Deploy to Vercel

### First Deployment (Preview)

```bash
vercel
```

You'll see prompts:
```
? Set up and deploy "~/Claude Code/Intran3t"? [Y/n] y
? Which scope do you want to deploy to? <Your Account>
? Link to existing project? [y/N] n
? What's your project's name? intran3t
? In which directory is your code located? ./
? Want to override the settings? [y/N] n
```

Vercel will:
1. Build your app
2. Deploy to a preview URL
3. Return: `https://intran3t-xxx.vercel.app`

**Test the preview URL** before going to production!

---

## Step 5: Deploy to Production

Once the preview looks good:

```bash
vercel --prod
```

This deploys to: `https://intran3t.vercel.app` (or your custom domain)

---

## Step 6: Set Environment Variables (If Needed)

If you need to override any environment variables in production:

```bash
# Add environment variable
vercel env add VITE_NETWORK

# When prompted:
# Environment: Production
# Value: testnet

# Or set multiple at once via Vercel Dashboard:
# 1. Go to vercel.com
# 2. Select your project
# 3. Settings → Environment Variables
# 4. Add each variable
```

**Current testnet variables** (already in `.env`):
- `VITE_NETWORK=testnet`
- `VITE_RBAC_CONTRACT_ADDRESS=0xF1152B54404F7F4B646199072Fd3819D097c4F94`
- `VITE_ASSETHUB_EVM_CHAIN_ID=420420417`
- `VITE_ASSETHUB_EVM_RPC=https://services.polkadothub-rpc.com/testnet`

---

## Step 7: Connect GitHub (Optional but Recommended)

For automatic deployments on every git push:

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/intran3t.git
   git push -u origin main
   ```

2. **Import on Vercel:**
   - Go to vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repo
   - Click "Deploy"

3. **Now every git push auto-deploys:**
   ```bash
   git add .
   git commit -m "Update feature"
   git push
   # Vercel automatically deploys!
   ```

---

## Common Commands

```bash
# Deploy preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List all deployments
vercel ls

# Remove a deployment
vercel rm <deployment-url>

# Open project in browser
vercel open

# Check deployment status
vercel inspect <deployment-url>
```

---

## Troubleshooting

### Build Fails

**Check build locally first:**
```bash
npm run build
```

If it fails locally, fix errors before deploying.

**Common issues:**
- TypeScript errors → Fix type issues
- Missing dependencies → `npm install`
- Environment variables → Check `.env` file

### API Proxy Not Working

Verify these files exist:
- ✅ `api/dotid-proxy.js`
- ✅ `vercel.json`

Check Vercel logs:
```bash
vercel logs --follow
```

### Wrong Network

Make sure environment variables are set:
```bash
vercel env ls
```

### Deployment Shows Old Version

Force rebuild:
```bash
vercel --force --prod
```

---

## Custom Domain Setup

### 1. Add Domain in Vercel Dashboard

1. Go to Project Settings → Domains
2. Add your domain: `yourdomain.com`
3. Copy the DNS records Vercel provides

### 2. Configure DNS

Add these records to your domain registrar:

**For root domain:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. Wait for DNS Propagation

Usually takes 5-30 minutes. Vercel will auto-provision SSL.

---

## Monitoring Your Deployment

### View Live Logs

```bash
vercel logs --follow
```

### Analytics (Free)

Enable in Vercel Dashboard → Analytics
- Page views
- Unique visitors
- Top pages
- Web Vitals

---

## Update Workflow

### Quick Updates (No GitHub)

```bash
# Make changes
vim src/App.tsx

# Deploy
vercel --prod
```

### With GitHub (Recommended)

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Vercel auto-deploys!
```

---

## Rollback

If something breaks:

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback
```

Or in Dashboard: Deployments → Previous Version → Promote to Production

---

## Cost

**Free Tier Includes:**
- Unlimited static deployments
- 100GB bandwidth/month
- Serverless functions (1000 invocations/day)
- Auto SSL
- Preview deployments
- Custom domains

**Perfect for PoC!**

---

## Next Steps After Deployment

1. ✅ Test all features on production URL
2. ✅ Share URL with team for feedback
3. ✅ Connect wallet and create test organization
4. ✅ Issue test credentials
5. ✅ Verify registry search works
6. 📊 Monitor usage in Vercel Analytics
7. 🔄 Iterate based on feedback

---

## Your Deployment Checklist

- [ ] Build works locally (`npm run build`)
- [ ] Preview works (`npm run preview`)
- [ ] Deployed to Vercel (`vercel`)
- [ ] Preview URL tested
- [ ] Deployed to production (`vercel --prod`)
- [ ] Production URL tested
- [ ] Wallet connects
- [ ] Admin panel works
- [ ] Contract interactions work
- [ ] Registry search works
- [ ] Shared with team

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel CLI:** https://vercel.com/docs/cli
- **Community:** https://github.com/vercel/vercel/discussions

Need help? Run `vercel help <command>`
