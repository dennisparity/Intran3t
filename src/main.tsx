import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  TypinkProvider,
  paseoAssetHub,
  polkadotPeople,
} from 'typink'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

// Use Paseo AssetHub for transactions, Polkadot People Chain for identities
const supportedNetworks = [
  paseoAssetHub,
  polkadotPeople,
]

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <TypinkProvider
      appName="Intran3t"
      supportedNetworks={supportedNetworks}
      defaultNetworkIds={[paseoAssetHub.id, polkadotPeople.id]}
      cacheMetadata={true}
    >
      <App />
    </TypinkProvider>
  </QueryClientProvider>
)
