# Light Client Integration Guide

This template uses **substrate-connect** to provide **light client** connections to Polkadot ecosystem blockchains. This means the application connects directly to the blockchain network without relying on centralized RPC servers.

## What is a Light Client?

A light client is a trustless way to interact with blockchain networks:

- **No RPC dependency**: Connects directly to blockchain nodes using P2P networking
- **Trustless**: Independently verifies blocks and transactions
- **Browser-based**: Runs entirely in the browser via WebAssembly (smoldot)
- **Shared sync**: Multiple dApps can share a single light client instance via browser extension

### Benefits

✅ **Decentralized** - No reliance on third-party RPC providers
✅ **Trustless** - Cryptographically verifies all data
✅ **Privacy** - No central server tracking your requests
✅ **Resilient** - Works even if RPC providers go down
✅ **Cost-effective** - No API rate limits or costs

### Trade-offs

⚠️ **Initial sync time** - First connection takes longer than RPC
⚠️ **Browser requirement** - Requires WebAssembly support
⚠️ **Resource usage** - Uses more browser resources than RPC calls

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Your dApp                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │          @polkadot/api (ApiPromise)              │  │
│  └────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│  ┌────────────────────▼─────────────────────────────┐  │
│  │  ScProvider (@polkadot/rpc-provider)             │  │
│  └────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│  ┌────────────────────▼─────────────────────────────┐  │
│  │  @substrate/connect                              │  │
│  │  (Discovery protocol + client management)        │  │
│  └────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│           ┌───────────▼──────────────┐                  │
│           │  Browser Extension?      │                  │
│           │  (Shared light client)   │                  │
│           └───────┬──────────┬───────┘                  │
│                   │ Yes      │ No                       │
│           ┌───────▼──────┐   │                          │
│           │ Use shared   │   │                          │
│           │ extension    │   │                          │
│           │ light client │   │                          │
│           └──────────────┘   │                          │
│                         ┌────▼─────────────────────┐    │
│                         │  Spawn smoldot WASM      │    │
│                         │  light client in tab     │    │
│                         └────┬─────────────────────┘    │
└──────────────────────────────┼──────────────────────────┘
                               │
                   ┌───────────▼────────────┐
                   │  Polkadot P2P Network  │
                   └────────────────────────┘
```

### Connection Flow

1. **dApp starts** → ScProvider initialized
2. **Discovery** → Checks for browser extension with shared light client
3. **Fallback** → If no extension, spawns smoldot in current tab
4. **Sync** → Light client syncs with network (downloads block headers)
5. **Ready** → ApiPromise connected and ready to use

## Usage in This Template

### PolkadotProvider

The `PolkadotProvider` ([src/providers/PolkadotProvider.tsx](src/providers/PolkadotProvider.tsx)) automatically uses light client connections:

```tsx
import { ScProvider } from "@polkadot/rpc-provider/substrate-connect";
import * as Sc from "@substrate/connect";

// For well-known chains (Polkadot, Kusama, Westend)
const provider = new ScProvider(Sc, Sc.WellKnownChain.polkadot);
await provider.connect();

const api = await ApiPromise.create({ provider });
```

### Chain Configuration

Chains are configured in [src/config/chains.ts](src/config/chains.ts) with light client support:

```typescript
export const POLKADOT: ChainConfig = {
  // ... other config
  wellKnownChain: WellKnownChain.polkadot, // For well-known chains
};

export const ASSETHUB_POLKADOT: ChainConfig = {
  // ... other config
  chainSpec: KnownChainSpecs.polkadot_asset_hub, // For parachains
};
```

### Supported Chains

#### Well-Known Relay Chains
- ✅ **Polkadot** (`WellKnownChain.polkadot`)
- ✅ **Kusama** (`WellKnownChain.ksmcc3`)
- ✅ **Westend** (`WellKnownChain.westend2`)

#### Parachains (via ChainSpec)
- ✅ **Polkadot AssetHub** (`polkadot_asset_hub`)
- ✅ **Kusama AssetHub** (`ksmcc3_asset_hub`)
- ✅ **Westend AssetHub** (`westend2_asset_hub`)
- ✅ **Paseo** (testnet)
- ✅ **People Chain** variants

## Components

### NetworkIndicator

The `NetworkIndicator` component shows light client sync status:

```tsx
import { NetworkIndicator } from '@/components/polkadot/NetworkIndicator';

<NetworkIndicator showLabel={true} />
```

**States:**
- 🟡 **Syncing Light Client...** - Initial sync in progress
- 🟢 **Light Client Connected** - Fully synced and ready
- 🔴 **Disconnected** - Connection error

### LightClientStatus (New)

Detailed status component with sync information:

```tsx
import { LightClientStatusDetailed } from '@/components/LightClientStatus';

<LightClientStatusDetailed />
```

Shows:
- Current sync state
- Helpful tips for users
- Visual indicators

## Adding Custom Chains

### For Well-Known Chains

If your chain is in `@substrate/connect-known-chains`:

```typescript
// In src/config/chains.ts
export const MY_CHAIN: ChainConfig = {
  id: "my-chain",
  name: "My Chain",
  // ... other config
  wellKnownChain: WellKnownChain.my_chain, // Use enum value
};
```

### For Custom Chains

For chains not in the well-known list:

```typescript
// 1. Import your chainspec JSON
import myChainSpec from "./chainspecs/my-chain.json";

// 2. Configure chain
export const MY_CUSTOM_CHAIN: ChainConfig = {
  id: "my-custom-chain",
  name: "My Custom Chain",
  // ... other config
  chainSpec: JSON.stringify(myChainSpec),
};
```

### For Parachains

Parachains must connect through their relay chain:

```typescript
// This is handled automatically by ScProvider
// Just specify the parachain chainspec
export const MY_PARACHAIN: ChainConfig = {
  id: "my-parachain",
  name: "My Parachain",
  // ... other config
  chainSpec: KnownChainSpecs.my_parachain,
  // The relay chain is embedded in the chainspec
};
```

## Browser Extension Support

### Installing Extension

Users can install the substrate-connect browser extension:

- **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org)

### Benefits of Extension

When the extension is installed:

1. **Shared sync** - One light client syncs for all dApps
2. **Background sync** - Stays synced even when tab is closed
3. **Faster startup** - dApps connect instantly to already-synced client
4. **Lower resource** - Browser manages single instance

The template automatically detects and uses the extension if available!

## API Compatibility

✅ All standard `@polkadot/api` methods work with light client:

```typescript
// Queries
await api.query.system.account(address);
await api.query.staking.validators();

// RPC calls
await api.rpc.chain.getHeader();
await api.rpc.system.chain();

// Transactions
const transfer = api.tx.balances.transferKeepAlive(dest, amount);
await transfer.signAndSend(address, { signer });

// Subscriptions
api.rpc.chain.subscribeNewHeads((header) => {
  console.log(`New block: ${header.number}`);
});
```

No code changes needed from traditional RPC connections!

## Performance Tips

### First Load

On first load, light client needs to sync:

```
Initial sync time by network:
- Polkadot: ~30-60 seconds
- Kusama: ~30-60 seconds
- Westend: ~10-30 seconds (fewer blocks)
- Parachains: ~20-40 seconds (after relay synced)
```

### Optimization Strategies

1. **Show sync status** - Use `NetworkIndicator` to show progress
2. **Defer heavy operations** - Wait for `status === 'connected'`
3. **Cache data** - Use React Query for client-side caching
4. **Recommend extension** - Prompt users to install for better UX

### Example: Waiting for Sync

```tsx
function MyComponent() {
  const { api, status } = usePolkadot();

  if (status === 'connecting') {
    return (
      <div>
        <NetworkIndicator />
        <p>Syncing with blockchain...</p>
      </div>
    );
  }

  if (status === 'error') {
    return <div>Connection error. Please refresh.</div>;
  }

  // status === 'connected' - safe to use api
  return <YourContent />;
}
```

## Troubleshooting

### "Light client connection failed"

**Possible causes:**
- Browser doesn't support WebAssembly
- Network firewall blocking P2P connections
- Invalid chainspec configuration

**Solutions:**
1. Check browser console for detailed errors
2. Try different network (e.g., cellular vs WiFi)
3. Verify chainspec is valid JSON

### Slow initial sync

**Normal behavior:**
- First connection always slower
- Network conditions affect speed
- More blocks = longer sync

**Improvements:**
1. Install browser extension for background sync
2. Keep tab open during initial sync
3. Add loading indicators for better UX

### "Chain not supported"

**Error:** Chain has no `wellKnownChain` or `chainSpec`

**Solution:**
Add chainspec to [src/config/chains.ts](src/config/chains.ts):

```typescript
import { chainSpec as myChain } from '@substrate/connect-known-chains/my-chain';

export const MY_CHAIN: ChainConfig = {
  // ... config
  chainSpec: myChain,
};
```

## Migration from RPC

Already using `WsProvider`? Migration is simple:

### Before (RPC)

```typescript
import { WsProvider, ApiPromise } from "@polkadot/api";

const provider = new WsProvider("wss://rpc.polkadot.io");
const api = await ApiPromise.create({ provider });
```

### After (Light Client)

```typescript
import { ApiPromise } from "@polkadot/api";
import { ScProvider } from "@polkadot/rpc-provider/substrate-connect";
import * as Sc from "@substrate/connect";

const provider = new ScProvider(Sc, Sc.WellKnownChain.polkadot);
await provider.connect();
const api = await ApiPromise.create({ provider });
```

**That's it!** All your existing `api.query`, `api.rpc`, `api.tx` code works unchanged.

## Resources

### Documentation
- **substrate-connect**: https://github.com/paritytech/substrate-connect
- **smoldot**: https://github.com/smol-dot/smoldot
- **Polkadot.js API**: https://polkadot.js.org/docs/

### Browser Extensions
- **Chrome**: Search "substrate-connect" in Chrome Web Store
- **Firefox**: Search "substrate-connect" in Firefox Add-ons

### Support
- **Issues**: [GitHub Issues](https://github.com/paritytech/substrate-connect/issues)
- **Polkadot Forum**: https://forum.polkadot.network/

---

**Built with ❤️ for the Polkadot ecosystem**
