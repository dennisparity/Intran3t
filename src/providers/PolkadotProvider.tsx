import { CHAINS, DEFAULT_CHAIN } from "@/config/chains";
import { ApiPromise } from "@polkadot/api";
import { ScProvider } from "@polkadot/rpc-provider/substrate-connect";
import * as Sc from "@substrate/connect";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ProviderState = {
  api: ApiPromise | null;
  status: "not-connected" | "connecting" | "connected" | "error";
  currentEndpoint: string;
  switchNetwork: (newEndpoint: string) => Promise<void>;
};

const PolkadotContext = createContext<ProviderState>({
  api: null,
  status: "not-connected",
  currentEndpoint: DEFAULT_CHAIN.endpoint,
  switchNetwork: async () => {},
});

export function usePolkadot() {
  return useContext(PolkadotContext);
}

export function usePolkadotContext() {
  return useContext(PolkadotContext);
}

export function PolkadotProvider({
  children,
  endpoint,
}: {
  children: React.ReactNode;
  endpoint?: string;
}) {
  // Get initial endpoint from localStorage or use default
  const getInitialEndpoint = () => {
    if (endpoint) return endpoint;
    const savedNetwork = localStorage.getItem("selected_network");
    if (savedNetwork) {
      const savedChain = Object.values(CHAINS).find(
        (c: any) => c.name === savedNetwork
      );
      if (savedChain) return (savedChain as any).endpoint;
    }
    return DEFAULT_CHAIN.endpoint;
  };

  const [currentEndpoint, setCurrentEndpoint] =
    useState<string>(getInitialEndpoint());
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [status, setStatus] =
    useState<ProviderState["status"]>("not-connected");

  useEffect(() => {
    let mounted = true;
    let provider: ScProvider | null = null;
    let apiInstance: ApiPromise | null = null;

    const connectWithLightClient = async () => {
      setStatus("connecting");

      // Find chain config for current endpoint
      const chainConfig = Object.values(CHAINS).find(
        (c) =>
          c.endpoint === currentEndpoint ||
          c.endpoints.includes(currentEndpoint)
      );

      if (!chainConfig) {
        console.error(`No chain config found for endpoint: ${currentEndpoint}`);
        setStatus("error");
        return;
      }

      try {
        console.log(`🔄 [Light Client] Connecting to ${chainConfig.name}...`);
        console.log(`📊 [Light Client] Chain config:`, {
          name: chainConfig.name,
          wellKnownChain: chainConfig.wellKnownChain,
          hasChainSpec: !!chainConfig.chainSpec,
        });

        // Create ScProvider based on chain configuration
        if (chainConfig.wellKnownChain) {
          // Use well-known chain (Polkadot, Kusama, Westend, etc.)
          console.log(`✓ [Light Client] Using WellKnownChain: ${chainConfig.wellKnownChain}`);
          provider = new ScProvider(Sc, chainConfig.wellKnownChain);
        } else if (chainConfig.chainSpec) {
          // Use custom chainspec (Paseo, AssetHub parachains, etc.)
          console.log(`✓ [Light Client] Using custom chainspec for: ${chainConfig.name}`);
          provider = new ScProvider(Sc, chainConfig.chainSpec);
        } else {
          throw new Error(
            `Chain ${chainConfig.name} has no wellKnownChain or chainSpec configured`
          );
        }

        console.log(`⏳ [Light Client] Connecting provider...`);
        // Connect the provider
        await provider.connect();
        console.log(`✓ [Light Client] Provider connected`);

        if (!mounted) {
          await provider.disconnect();
          return;
        }

        console.log(`⏳ [Light Client] Creating API instance...`);
        // Create API instance
        apiInstance = await ApiPromise.create({ provider });
        console.log(`⏳ [Light Client] Waiting for API ready...`);
        await apiInstance.isReady;
        console.log(`✓ [Light Client] API is ready`);

        if (!mounted) {
          await apiInstance.disconnect();
          return;
        }

        console.log(`✅ [Light Client] Successfully connected to ${chainConfig.name}!`);
        setApi(apiInstance);
        setStatus("connected");
      } catch (e) {
        console.error("❌ [Light Client] Connection failed:", e);
        console.error("❌ [Light Client] Error details:", {
          message: (e as Error).message,
          stack: (e as Error).stack,
        });
        if (mounted) {
          setStatus("error");
        }
        if (provider) {
          await provider.disconnect().catch(console.error);
        }
      }
    };

    connectWithLightClient();

    return () => {
      mounted = false;
      if (apiInstance) {
        console.log(`🔌 [Light Client] Disconnecting API...`);
        apiInstance.disconnect().catch(console.error);
      }
      if (provider) {
        console.log(`🔌 [Light Client] Disconnecting provider...`);
        provider.disconnect().catch(console.error);
      }
    };
  }, [currentEndpoint]);

  const switchNetwork = async (newEndpoint: string) => {
    if (newEndpoint === currentEndpoint) return;

    // Disconnect current API
    if (api) {
      await api.disconnect();
      setApi(null);
    }

    // Set new endpoint (will trigger useEffect to reconnect)
    setCurrentEndpoint(newEndpoint);
  };

  const value = useMemo(
    () => ({
      api,
      status,
      currentEndpoint,
      switchNetwork,
    }),
    [api, status, currentEndpoint]
  );

  return (
    <PolkadotContext.Provider value={value}>
      {children}
    </PolkadotContext.Provider>
  );
}
