# Vercel Environment Variables Setup

## ⚠️ Important: Remove Old/Wrong Values First

Before deploying, **remove** these old environment variables from Vercel Dashboard:

1. Go to: https://vercel.com/[your-team]/intran3t/settings/environment-variables
2. **Delete** any existing entries for:
   - `VITE_FORMS_CONTRACT_ADDRESS`
   - `VITE_RELAY_PRIVATE_KEY`
   - Any other variables that might have wrong values

## Required Environment Variables

Set these in **all three environments** (Production, Preview, Development):

### Smart Contracts (Paseo Asset Hub TestNet)
```
VITE_FORMS_CONTRACT_ADDRESS=0xe2F988c1aD2533F473265aCD9C0699bE47643316
VITE_ACCESSPASS_CONTRACT_ADDRESS=0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94
VITE_RBAC_CONTRACT_ADDRESS=0xF1152B54404F7F4B646199072Fd3819D097c4F94
```

### Network Configuration
```
VITE_NETWORK=testnet
VITE_ASSETHUB_EVM_CHAIN_ID=420420417
VITE_ASSETHUB_EVM_RPC=https://eth-rpc-testnet.polkadot.io
```

### People Chain
```
VITE_PEOPLE_CHAIN_RPC=wss://polkadot-people-rpc.polkadot.io
VITE_DOTID_API_URL=/api/dotid-proxy
```

### Alice Relay (Testnet Only)
```
VITE_RELAY_PRIVATE_KEY=0xeac327ca625c41990bf3ecb8067e8d11316b2bc6fec4cf1acad1c21010b332ea
```
**Note:** This is the public Alice dev account key, safe for testnet only.

### Organization & Feature Flags
```
VITE_DEFAULT_ORG_ID=0xda0dfc1c44fa23815556554502d3d60780123f046c95672cf200d7b6517f5bcc
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_LOGS=true
```

## Step-by-Step Instructions

1. **Remove old values:**
   - Go to Vercel Dashboard → Intran3t → Settings → Environment Variables
   - Click "..." on each old/wrong variable → Delete

2. **Add new values:**
   - Click "Add New" for each variable above
   - Select "All Environments" (Production, Preview, Development)
   - Paste the exact value (ensure no extra whitespace or newlines!)

3. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment → Redeploy

## ✅ Verification

After deployment, test form creation:
1. Connect Substrate wallet (Talisman/SubWallet)
2. Create a form
3. **Expected:** Short link like `/f/7` (numeric ID)
4. **Wrong:** Long link like `/f/form-1772018900180-...` (UUID)

If you see UUID links, the env var is still wrong!

## Security Notes

- ✅ All `VITE_*` variables are bundled into the app (public by design)
- ✅ Alice relay key is public knowledge (testnet only)
- ❌ Never commit `.env.production` to git (now gitignored)
- ✅ Use `.env.production.example` as template
