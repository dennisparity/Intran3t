# Light Client Debugging Guide

## How to Check Light Client Status

### 1. **In the UI**

The light client status is now visible in **two places**:

#### Top Navigation Bar
Look for the **NetworkIndicator** (top-right, before the network dropdown):
- 🟡 **"Syncing Light Client..."** - Yellow, spinning (initial connection)
- 🟢 **"Light Client Connected"** - Green, pulsing (fully synced)
- 🔴 **"Disconnected"** - Red (connection error)

#### Network Dropdown
Click on the network name (e.g., "Polkadot") to see the dropdown footer:
- Status appears on the right side
- Real-time updates as connection progresses

### 2. **In Browser Console**

Open Developer Tools (F12 or Cmd+Option+I) and check the Console tab.

You should see detailed logs:

```
🔄 [Light Client] Connecting to Polkadot...
📊 [Light Client] Chain config: {name: "Polkadot", wellKnownChain: "polkadot", hasChainSpec: false}
✓ [Light Client] Using WellKnownChain: polkadot
⏳ [Light Client] Connecting provider...
✓ [Light Client] Provider connected
⏳ [Light Client] Creating API instance...
⏳ [Light Client] Waiting for API ready...
✓ [Light Client] API is ready
✅ [Light Client] Successfully connected to Polkadot!
```

---

## Common Issues & Solutions

### Issue 1: Status Stuck on "Syncing Light Client..."

**Symptoms:**
- Yellow indicator stays for more than 2 minutes
- No progress in console

**Possible Causes:**
1. **Slow network connection** - Light client needs to download block headers
2. **Firewall blocking P2P** - Some firewalls block WebRTC/P2P connections
3. **Browser compatibility** - Old browsers may not support WebAssembly

**Solutions:**
- Check browser console for errors
- Try different network (WiFi vs cellular)
- Use modern browser (Chrome, Firefox, Edge - latest versions)
- Wait up to 2-3 minutes for initial sync

### Issue 2: Status Shows "Error" (Red)

**Symptoms:**
- Red "Disconnected" indicator
- Console shows `❌ [Light Client] Connection failed`

**Debug Steps:**

1. **Check Console for Error Details**
   ```javascript
   // Look for error messages like:
   ❌ [Light Client] Connection failed: Error: ...
   ❌ [Light Client] Error details: {message: "...", stack: "..."}
   ```

2. **Common Error Messages:**

   **"Chain has no wellKnownChain or chainSpec configured"**
   - The chain configuration is incomplete
   - Check `src/config/chains.ts` for the selected chain
   - Ensure it has either `wellKnownChain` or `chainSpec` property

   **"Failed to connect"**
   - Network connectivity issue
   - Try refreshing the page
   - Check internet connection

   **"WebAssembly is not supported"**
   - Browser doesn't support WASM
   - Update your browser

### Issue 3: Page Loads but Nothing Connects

**Symptoms:**
- Page loads fine
- No status indicator visible
- No console logs

**Solutions:**

1. **Check if PolkadotProvider is wrapping the app**
   ```tsx
   // In src/App.tsx, should be:
   <PolkadotProvider>
     <BrowserRouter>
       ...
     </BrowserRouter>
   </PolkadotProvider>
   ```

2. **Clear browser cache**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear cache in DevTools

3. **Check if NetworkIndicator is imported**
   ```tsx
   // In src/App.tsx
   import { NetworkIndicator } from "./components/polkadot/NetworkIndicator";
   ```

---

## Debugging Checklist

When light client isn't working, check these in order:

### Step 1: Visual Checks
- [ ] Can you see NetworkIndicator in top-right navigation?
- [ ] Open network dropdown - do you see status at the bottom?
- [ ] What color is the status indicator?

### Step 2: Console Checks
- [ ] Open Browser Console (F12)
- [ ] Do you see `🔄 [Light Client]` logs?
- [ ] Are there any `❌ [Light Client]` errors?
- [ ] What's the last log message you see?

### Step 3: Network Checks
- [ ] Are you connected to the internet?
- [ ] Try a different network (WiFi vs cellular)
- [ ] Check if VPN/firewall is blocking connections

### Step 4: Browser Checks
- [ ] Using a modern browser (Chrome 90+, Firefox 88+, Safari 14+)?
- [ ] Does your browser support WebAssembly?
  - Test at: https://webassembly.org/demo/
- [ ] Try a different browser

### Step 5: Code Checks
- [ ] Did the build succeed? (`pnpm build`)
- [ ] Check `src/config/chains.ts` - does selected chain have `wellKnownChain` or `chainSpec`?
- [ ] Check `package.json` - are `@substrate/connect` packages installed?

---

## Expected Behavior

### Timeline
| Time | Status | What's Happening |
|------|--------|------------------|
| 0s | 🟡 Syncing | Provider connecting |
| 2-5s | 🟡 Syncing | Downloading chainspec |
| 5-30s | 🟡 Syncing | Syncing block headers |
| 30-60s | 🟡 Syncing | Still syncing (Polkadot/Kusama) |
| 60s+ | 🟢 Connected | Fully synced! |

**Note:** Westend testnet usually syncs faster (10-30s) because it has fewer blocks.

### First vs. Subsequent Loads
- **First load:** 30-60 seconds (full sync)
- **With browser extension:** 2-5 seconds (pre-synced)
- **Without extension (reload):** 30-60 seconds (re-sync)

---

## Advanced Debugging

### Enable Verbose Logging

Add this to your browser console while the app is running:

```javascript
// Set localStorage debug flag
localStorage.setItem('debug', 'sc-*');

// Reload page
location.reload();
```

This enables verbose logging from substrate-connect.

### Check Provider State

While the app is running, open console and type:

```javascript
// Check global state (if available)
window.__POLKADOT_DEVTOOLS_GLOBAL_HOOK__
```

### Monitor Network Requests

1. Open DevTools → Network tab
2. Look for WebSocket connections
3. Should see WebRTC/P2P connections being established

---

## Performance Tips

### Make Sync Faster

1. **Install Browser Extension**
   - Substrate Connect extension keeps light client synced in background
   - App connects instantly to pre-synced client
   - Download from Chrome Web Store or Firefox Add-ons

2. **Keep Tab Open**
   - Light client stays synced while tab is open
   - Switching tabs/minimizing is fine

3. **Use Testnet for Development**
   - Westend syncs much faster than Polkadot
   - Switch network in dropdown for faster testing

---

## Getting Help

If you're still stuck:

1. **Collect Information:**
   - Browser version
   - Console logs (copy full output)
   - Network status (which chain, which network)
   - Error messages

2. **Check GitHub Issues:**
   - substrate-connect: https://github.com/paritytech/substrate-connect/issues
   - polkadot-ui-template: https://github.com/paritytech/polkadot-ui-template/issues

3. **Ask in Community:**
   - Polkadot Forum: https://forum.polkadot.network/
   - Polkadot Discord: https://discord.gg/polkadot

---

## Quick Test

Run this in your browser console to test if light client is working:

```javascript
// Test substrate-connect
import('@substrate/connect').then(async (Sc) => {
  console.log('✓ substrate-connect loaded');
  const client = Sc.createScClient();
  console.log('✓ client created:', client);
  try {
    const chain = await client.addWellKnownChain(Sc.WellKnownChain.westend2);
    console.log('✅ Connected to Westend!', chain);
  } catch (e) {
    console.error('❌ Failed:', e);
  }
});
```

---

*Last updated: November 27, 2025*
