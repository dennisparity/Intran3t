import { useQuery } from '@tanstack/react-query'
import { queryOnChainIdentity, type IdentityInfo } from './identity-helpers'

export function useIdentity(address: string | undefined) {
  return useQuery({
    queryKey: ['identity', address],
    queryFn: async () => {
      if (!address) return null

      const result = await queryOnChainIdentity(address)

      if (!result.success) {
        console.error('Failed to fetch identity:', result.error)
        return null
      }

      return result.identity || null
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}
