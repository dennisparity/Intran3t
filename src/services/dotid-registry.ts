/**
 * DotID Registry API Integration
 *
 * Provides access to the public People Chain identity registry at dotid.app
 * Enables searching verified on-chain identities by name without needing full addresses
 */

export interface RegistryIdentity {
  address: string
  display: string | null
  email: string | null
  twitter: string | null
  matrix: string | null
  legal: string | null
  web: string | null
  github: string | null
  discord: string | null
  image: string | null
  judgements: Array<{
    judgement: string
    registrarIndex: number
  }>
}

// Use local proxy in development, serverless function in production
const DOTID_API_BASE = import.meta.env.DEV
  ? '/api/dotid/identities'
  : (import.meta.env.VITE_DOTID_API_URL || '/api/dotid-proxy')
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Simple in-memory cache
let cachedIdentities: RegistryIdentity[] | null = null
let cacheTimestamp: number | null = null

/**
 * Fetch all identities from the registry
 * Results are cached for 5 minutes to reduce API calls
 */
export async function fetchRegistryIdentities(): Promise<RegistryIdentity[]> {
  const now = Date.now()

  // Return cached data if still valid
  if (cachedIdentities && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📦 Using cached registry data')
    return cachedIdentities
  }

  console.log('🌐 Fetching identities from dotid.app registry...')

  try {
    const response = await fetch(DOTID_API_BASE)

    if (!response.ok) {
      throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`)
    }

    const identities: RegistryIdentity[] = await response.json()

    console.log(`✅ Fetched ${identities.length} identities from registry`)

    // Update cache
    cachedIdentities = identities
    cacheTimestamp = now

    return identities
  } catch (error) {
    console.error('❌ Failed to fetch registry identities:', error)

    // Return cached data if available, even if expired
    if (cachedIdentities) {
      console.log('⚠️ Returning stale cached data due to fetch error')
      return cachedIdentities
    }

    throw error
  }
}

/**
 * Search identities by display name, legal name, twitter, or matrix
 * Case-insensitive partial match
 */
export async function searchRegistryByName(query: string): Promise<RegistryIdentity[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  const identities = await fetchRegistryIdentities()
  const normalizedQuery = query.toLowerCase().trim()

  return identities.filter(identity => {
    // Skip identities without a display name
    if (!identity.display) return false

    // Match by display name
    const displayMatch = identity.display.toLowerCase().includes(normalizedQuery)

    // Match by legal name if available
    const legalMatch = identity.legal?.toLowerCase().includes(normalizedQuery)

    // Match by twitter handle
    const twitterMatch = identity.twitter?.toLowerCase().includes(normalizedQuery)

    // Match by matrix handle
    const matrixMatch = identity.matrix?.toLowerCase().includes(normalizedQuery)

    return displayMatch || legalMatch || twitterMatch || matrixMatch
  })
}

/**
 * Search identity by exact address match
 */
export async function searchRegistryByAddress(address: string): Promise<RegistryIdentity | null> {
  const identities = await fetchRegistryIdentities()
  return identities.find(identity => identity.address === address) || null
}

/**
 * Check if an identity is verified (has positive judgement)
 */
export function isVerified(identity: RegistryIdentity): boolean {
  return identity.judgements.some(j =>
    j.judgement === 'Reasonable' || j.judgement === 'KnownGood'
  )
}

/**
 * Get paginated results
 */
export function paginateResults(
  identities: RegistryIdentity[],
  page: number = 1,
  pageSize: number = 20
): RegistryIdentity[] {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return identities.slice(start, end)
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cachedIdentities = null
  cacheTimestamp = null
  console.log('🗑️ Registry cache cleared')
}
