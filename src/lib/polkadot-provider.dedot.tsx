"use client";

import {
  type ContractDeployment,
  type NetworkId,
  type NetworkInfo,
  paseo,
  paseoAssetHub,
  paseoPeople,
  polkadot,
  polkadotAssetHub,
  polkadotPeople,
  TypinkProvider,
} from "typink";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Use Paseo AssetHub for transactions, Polkadot People Chain for identities
export const SUPPORTED_NETWORKS = [
  paseoAssetHub,
  polkadotPeople, // For identity queries (identities are on mainnet)
];

const queryClient = new QueryClient();

export function PolkadotProvider({
  children,
  appName = "Polkadot UI App",
  defaultCaller = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  supportedNetworks = SUPPORTED_NETWORKS,
}: {
  children: React.ReactNode;
  appName?: string;
  defaultCaller?: string;
  defaultNetworkId?: NetworkId;
  deployments?: ContractDeployment[];
  supportedNetworks?: NetworkInfo[];
}) {
  // Debug: Log network configuration
  console.log('PolkadotProvider initialized with networks:', supportedNetworks.map(n => ({ id: n.id, name: n.name })))
  console.log('Default network IDs:', [paseoAssetHub.id, polkadotPeople.id])

  return (
    <QueryClientProvider client={queryClient}>
      <TypinkProvider
        appName={appName}
        defaultCaller={defaultCaller}
        supportedNetworks={supportedNetworks}
        defaultNetworkIds={[paseoAssetHub.id, polkadotPeople.id]} // Connect to AssetHub (testnet) and People Chain (mainnet)
        cacheMetadata={true}
      >
        {children}
      </TypinkProvider>
    </QueryClientProvider>
  );
}
