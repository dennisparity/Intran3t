import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryOnChainIdentity, type IdentityInfo } from '../modules/profile/identity-helpers'
import { TEAM_MEMBERS } from '../config/team-members'
import { searchRegistryByName, isVerified } from '../services/dotid-registry'

export interface UserSearchResult {
  address: string
  identity: IdentityInfo | null
  role?: string
  source?: 'team' | 'discovered' | 'registry'
}

/**
 * Load discovered users from localStorage
 */
function loadDiscoveredUsers() {
  try {
    const stored = localStorage.getItem('intran3t_discovered_users')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Search for team members by name or address
 * Includes: discovered users, team members, and People Registry (dotid.app)
 */
export function useUserSearch(searchQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return useQuery({
    queryKey: ['userSearch', debouncedQuery],
    queryFn: async (): Promise<UserSearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return []
      }

      const query = debouncedQuery.toLowerCase().trim()

      // Search People Registry (dotid.app) in parallel with local search
      const registrySearchPromise = searchRegistryByName(query)
        .then(registryResults => {
          console.log(`🔍 Found ${registryResults.length} results in People Registry`)
          return registryResults
            .filter(reg => reg.display) // Only include identities with display names
            .slice(0, 5) // Limit to top 5 registry results to avoid overwhelming UI
            .map(reg => ({
              address: reg.address,
              identity: {
                display: reg.display || undefined,
                legal: reg.legal || undefined,
                email: reg.email || undefined,
                web: reg.web || undefined,
                twitter: reg.twitter || undefined,
                matrix: reg.matrix || undefined,
                github: reg.github || undefined,
                discord: reg.discord || undefined,
                verified: isVerified(reg)
              },
              role: undefined,
              source: 'registry' as const
            }))
        })
        .catch(error => {
          console.warn('⚠️ Failed to search People Registry:', error)
          return [] // Don't fail the entire search if registry is down
        })

      // Load discovered users
      const discoveredUsers = loadDiscoveredUsers()

      // Search through discovered users first (they already have identities cached)
      const discoveredResults = discoveredUsers
        .filter((user: any) => {
          // Match by Substrate address
          const substrateMatch = user.substrateAddress?.toLowerCase().includes(query)

          // Match by EVM address
          const evmMatch = user.evmAddress?.toLowerCase().includes(query)

          // Match by identity display name
          const nameMatch = user.identity?.display?.toLowerCase().includes(query)

          // Match by email
          const emailMatch = user.identity?.email?.toLowerCase().includes(query)

          return substrateMatch || evmMatch || nameMatch || emailMatch
        })
        .map((user: any) => ({
          address: user.substrateAddress,
          identity: user.identity,
          role: 'member',
          source: 'discovered' as const
        }))

      // Search through configured team members
      const searchPromises = TEAM_MEMBERS.map(async (member) => {
        try {
          // Fetch identity for this team member
          const result = await queryOnChainIdentity(member.address)

          // If query matches address (partial match)
          const addressMatch = member.address.toLowerCase().includes(query)

          // If identity exists, check if query matches display name
          let nameMatch = false
          if (result.success && result.identity?.display) {
            nameMatch = result.identity.display.toLowerCase().includes(query)
          }

          // Return result if there's a match
          if (addressMatch || nameMatch) {
            return {
              address: member.address,
              identity: result.identity || null,
              role: member.role,
              source: 'team' as const
            }
          }

          return null
        } catch (error) {
          console.error(`Error fetching identity for ${member.address}:`, error)
          return null
        }
      })

      const teamResults = await Promise.all(searchPromises)

      // Wait for registry search to complete
      const registryResults = await registrySearchPromise

      // Combine all sources: discovered users, team members, and registry results
      const allResults = [
        ...discoveredResults,
        ...teamResults.filter((result): result is UserSearchResult => result !== null),
        ...registryResults
      ]

      // Remove duplicates by address (prioritize team > discovered > registry)
      const uniqueResults = allResults.reduce((acc, result) => {
        if (!acc.find(r => r.address === result.address)) {
          acc.push(result)
        }
        return acc
      }, [] as UserSearchResult[])

      console.log(`✅ Total search results: ${uniqueResults.length} (${discoveredResults.length} discovered, ${teamResults.filter(r => r !== null).length} team, ${registryResults.length} registry)`)

      return uniqueResults
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds (shorter for discovered users)
    retry: 1
  })
}
