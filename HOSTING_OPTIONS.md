# Intran3t Hosting Options Guide

## Overview

Intran3t is a **static React application** with no backend server requirements. The blockchain (Asset Hub + People Chain) IS your backend. This means you have maximum flexibility in hosting options.

---

## Option 1: IPFS (Fully Decentralized) ⭐⭐⭐⭐⭐

### Why IPFS?
- 100% decentralized, censorship-resistant
- No servers to maintain
- Content-addressed (tamper-proof)
- Free forever
- Aligns with Web3 philosophy

### How It Works
```
User → IPFS Gateway → Your App (on IPFS) → Light Client → Blockchain
```

### Deployment Steps

#### 1. Install IPFS Deploy Tool
```bash
npm install -g ipfs-deploy
```

#### 2. Build Your App
```bash
npm run build
```

#### 3. Deploy to IPFS
```bash
ipfs-deploy dist

# Or with specific pinning services
ipfs-deploy dist -p pinata -p infura
```

#### 4. Access Your App
```
ipfs://QmXxxx...   (IPFS native)
https://QmXxxx.ipfs.dweb.link   (HTTP gateway)
https://QmXxxx.ipfs.io   (Alternative gateway)
```

### Custom Domain Setup

**Option A: DNSLink**
```bash
# Add TXT record to your domain DNS:
# _dnslink.yourdomain.com TXT "dnslink=/ipfs/QmXxxx..."

# Access via:
# https://yourdomain.com.ipns.dweb.link
```

**Option B: Fleek (Easiest)**
```bash
npm install -g @fleek/cli
fleek sites deploy --dir=dist

# Fleek provides:
# - Custom domains
# - Auto SSL
# - IPFS pinning
# - CI/CD from GitHub
```

### Required Changes for IPFS

Since IPFS can't run serverless functions, you have 2 options for dotid.app:

**Option A: Remove Registry Search (Simplest)**
```typescript
// Just use address-based People Chain lookup (already works)
// Remove registry browser from Admin.tsx
```

**Option B: Use Public CORS Proxy**
```typescript
// Use a service like:
const DOTID_API_BASE = 'https://api.allorigins.win/get?url=https://dotid.app/api/directory/identities'
```

### Pros & Cons

✅ **Pros:**
- Truly decentralized
- No ongoing costs
- Censorship resistant
- No single point of failure
- Permanent (if pinned)

❌ **Cons:**
- Slower initial load (no CDN)
- Requires IPFS gateway for HTTP access
- No serverless functions (need workaround for dotid proxy)
- CID changes with each update (need DNSLink for stable URLs)

### Cost
**FREE** (just need pinning service, many have free tiers)

---

## Option 2: Vercel (Recommended for PoC) ⭐⭐⭐⭐

### Why Vercel?
- Dead simple deployment
- Serverless functions work (dotid proxy)
- Auto SSL, custom domains
- GitHub integration (auto-deploy)
- Generous free tier

### Deployment Steps

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Login
```bash
vercel login
```

#### 3. Deploy
```bash
# First deployment
vercel

# Production deployment
vercel --prod
```

#### 4. (Optional) Connect GitHub
- Push to GitHub
- Import project on vercel.com
- Auto-deploys on every push

### Custom Domain
```bash
vercel domains add yourdomain.com
# Follow DNS instructions
```

### Environment Variables
Set in Vercel Dashboard or via CLI:
```bash
vercel env add VITE_NETWORK production
vercel env add VITE_RBAC_CONTRACT_ADDRESS production
```

### Pros & Cons

✅ **Pros:**
- Easiest to deploy
- Fast global CDN
- Serverless functions work
- Free SSL
- Preview deployments
- Zero config

❌ **Cons:**
- Centralized (Vercel controls)
- Can suspend account
- Subject to their ToS
- Not censorship-resistant

### Cost
**FREE** for personal projects (Hobby plan)
- 100GB bandwidth/month
- Unlimited static requests
- Serverless functions included

---

## Option 3: Netlify ⭐⭐⭐⭐

### Why Netlify?
- Similar to Vercel
- Also supports serverless functions
- Great for static sites
- Good developer experience

### Deployment Steps

#### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### 2. Login
```bash
netlify login
```

#### 3. Build and Deploy
```bash
npm run build
netlify deploy --prod --dir=dist
```

#### 4. Or Connect GitHub
- Push to GitHub
- Import on netlify.com
- Auto-deploys on push

### Serverless Function Setup
Create `netlify/functions/dotid-proxy.js`:
```javascript
exports.handler = async (event, context) => {
  const response = await fetch('https://dotid.app/api/directory/identities');
  const data = await response.json();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
};
```

Update `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/dotid-proxy"
  to = "/.netlify/functions/dotid-proxy"
  status = 200
```

### Pros & Cons
Similar to Vercel - easy, centralized, free tier available.

### Cost
**FREE** for personal projects
- 100GB bandwidth/month
- Serverless functions included

---

## Option 4: GitHub Pages (Simple Static Only) ⭐⭐

### Why GitHub Pages?
- Free
- Easy if you're already on GitHub
- Simple for static sites

### Deployment Steps

#### 1. Install gh-pages
```bash
npm install --save-dev gh-pages
```

#### 2. Add Scripts to package.json
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

#### 3. Deploy
```bash
npm run deploy
```

#### 4. Enable GitHub Pages
- Go to repo Settings → Pages
- Source: gh-pages branch
- Access: https://yourusername.github.io/intran3t

### Limitations
❌ **No serverless functions** - dotid.app proxy won't work
❌ No custom domains on free tier (without workarounds)
✅ Good for simple static hosting

### Cost
**FREE**

---

## Option 5: Self-Hosted (Full Control) ⭐⭐⭐

### Why Self-Host?
- Complete control
- Not dependent on third parties
- Can run custom backend if needed
- Can be "decentralized" if you own the server

### Setup Options

#### Option A: Simple Static Server (Nginx/Apache)

**On Ubuntu/Debian:**
```bash
# Install nginx
sudo apt update
sudo apt install nginx

# Build your app
npm run build

# Copy to web root
sudo cp -r dist/* /var/www/html/

# Configure nginx for SPA routing
sudo nano /etc/nginx/sites-available/default
```

nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**For HTTPS:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Option B: Docker Container

Create `Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Deploy:
```bash
docker build -t intran3t .
docker run -d -p 80:80 intran3t
```

#### Option C: Node.js Server (for dotid proxy)

```javascript
// server.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Serve static files
app.use(express.static('dist'));

// Proxy for dotid.app
app.use('/api/dotid', createProxyMiddleware({
  target: 'https://dotid.app/api/directory',
  changeOrigin: true,
  pathRewrite: { '^/api/dotid': '' }
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile('dist/index.html', { root: '.' });
});

app.listen(3000);
```

### Hosting Providers
- DigitalOcean ($5-10/month)
- Linode ($5/month)
- Hetzner ($4/month)
- AWS Lightsail ($3.50/month)

### Pros & Cons

✅ **Pros:**
- Full control
- Can customize everything
- Run any backend code
- Own your infrastructure

❌ **Cons:**
- Need to maintain server
- Security updates
- Monitoring required
- Not truly decentralized (single server)
- Costs money

### Cost
**$3-10/month** depending on provider

---

## Decision Matrix

| Criteria | IPFS | Vercel | Netlify | Self-Hosted | GitHub Pages |
|----------|------|--------|---------|-------------|--------------|
| **Decentralization** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐⭐ | ⭐ |
| **Ease of Deploy** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **dotid Proxy** | ❌* | ✅ | ✅ | ✅ | ❌ |
| **Custom Domain** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Cost** | FREE | FREE | FREE | $5-10/mo | FREE |
| **Speed** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Maintenance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Censorship Resistance** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ | ⭐⭐⭐ | ⭐ |

*Can work with public CORS proxy or by removing feature

---

## Recommendations by Use Case

### For Proof of Concept (Now)
**→ Vercel or Netlify**
- Fastest to get running
- All features work
- Free
- Can migrate later

### For Production (Decentralized)
**→ IPFS + Fleek**
- Truly decentralized
- Professional features
- Custom domain
- Worth the small trade-offs

### For Maximum Control
**→ Self-Hosted**
- Your own VPS
- Docker deployment
- Full customization

### Hybrid Approach (Recommended)
**→ IPFS + Vercel**
- Primary: IPFS (decentralized)
- Mirror: Vercel (fast CDN)
- Use IPFS hash in both
- Best of both worlds

---

## Quick Start Commands

### IPFS Deployment
```bash
npm run build
npx ipfs-deploy dist -p pinata
```

### Vercel Deployment
```bash
npm install -g vercel
vercel --prod
```

### Netlify Deployment
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Self-Hosted (Docker)
```bash
docker build -t intran3t .
docker run -d -p 80:80 intran3t
```

---

## Migration Path

### Phase 1: PoC (Now)
- Deploy to Vercel (easiest)
- Test all features
- Iterate quickly

### Phase 2: Staging (Before Launch)
- Deploy to IPFS
- Test decentralized hosting
- Verify all features work

### Phase 3: Production
- IPFS as primary
- Vercel as fallback/CDN mirror
- Custom domain with DNSLink

---

## Support & Resources

- **IPFS:** https://docs.ipfs.tech
- **Fleek:** https://fleek.co
- **Vercel:** https://vercel.com/docs
- **Netlify:** https://docs.netlify.com

---

Need help with deployment? Check the troubleshooting section in DEPLOYMENT_GUIDE.md
