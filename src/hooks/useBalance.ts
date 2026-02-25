import { useQuery } from '@tanstack/react-query'
import { useWallet } from '../providers/WalletProvider'

export interface BalanceInfo {
  free: bigint
  reserved: bigint
  frozen: bigint
}

/**
 * Hook to fetch account balance using Product SDK (PAPI)
 * Replaces old PolkadotProvider with WalletProvider for consistency
 *
 * @param address - The account address to query (optional - defaults to selectedAccount)
 * @param refetchInterval - Time in ms between refetches (default: 6000)
 * @returns Query result with balance information
 *
 * @example
 * ```tsx
 * function Balance() {
 *   const { data: balance, isLoading, error } = useBalance()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error loading balance</div>
 *
 *   return <div>Free: {balance?.free.toString()}</div>
 * }
 * ```
 */
export function useBalance(address?: string, refetchInterval = 6000) {
  const { apiClient, selectedAccount } = useWallet()

  // Use provided address or fall back to selected account
  const targetAddress = address || selectedAccount?.address

  return useQuery({
    queryKey: ['balance', targetAddress],
    queryFn: async (): Promise<BalanceInfo> => {
      if (!apiClient) throw new Error('API client not initialized')
      if (!targetAddress) throw new Error('No address provided')

      const accountInfo = await apiClient.query.System.Account.getValue(targetAddress)

      return {
        free: accountInfo.data.free,
        reserved: accountInfo.data.reserved,
        frozen: accountInfo.data.frozen
      }
    },
    enabled: !!apiClient && !!targetAddress,
    refetchInterval,
    staleTime: 5000,
  })
}
