import { ApiPromise, WsProvider } from '@polkadot/api'
import { hexToString } from '@polkadot/util'

// Polkadot People Chain RPC endpoints (mainnet)
const POLKADOT_PEOPLE_RPC_ENDPOINTS = [
  'wss://polkadot-people-rpc.polkadot.io',
  'wss://sys.ibp.network/people-polkadot',
  'wss://people-polkadot.dotters.network'
]

// Singleton API instance for People Chain
let peopleChainApiInstance: ApiPromise | null = null

/**
 * Connect to Polkadot People Chain
 */
async function getPeopleChainApi(): Promise<ApiPromise> {
  if (peopleChainApiInstance) {
    return peopleChainApiInstance
  }

  console.log('Initializing connection to Polkadot People Chain...')

  const errors: string[] = []

  for (const endpoint of POLKADOT_PEOPLE_RPC_ENDPOINTS) {
    try {
      console.log(`Attempting connection to ${endpoint}...`)

      const provider = new WsProvider(endpoint, 1000) // 1 second timeout

      // Wait for connection with timeout
      const connectPromise = new Promise<ApiPromise>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 5000) // 5 second total timeout

        ApiPromise.create({ provider })
          .then(api => api.isReady)
          .then(api => {
            clearTimeout(timeout)
            resolve(api)
          })
          .catch(err => {
            clearTimeout(timeout)
            reject(err)
          })
      })

      const api = await connectPromise
      console.log(`✓ Connected to Polkadot People Chain via ${endpoint}`)
      peopleChainApiInstance = api
      return api

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.warn(`✗ Failed to connect to ${endpoint}: ${errorMsg}`)
      errors.push(`${endpoint}: ${errorMsg}`)
      continue
    }
  }

  // All endpoints failed
  const errorMessage = `Failed to connect to Polkadot People Chain. Tried ${POLKADOT_PEOPLE_RPC_ENDPOINTS.length} endpoints:\n${errors.join('\n')}`
  console.error(errorMessage)
  throw new Error(errorMessage)
}

export interface IdentityInfo {
  display?: string
  legal?: string
  email?: string
  web?: string
  twitter?: string
  riot?: string
  github?: string
  discord?: string
  matrix?: string
  verified: boolean
}

/**
 * Decode identity field data
 * Handles various formats returned by the API
 */
function decodeIdentityData(data: any): string | undefined {
  if (!data) return undefined

  try {
    // Try toHuman() FIRST - it's the most reliable method
    if (typeof data.toHuman === 'function') {
      const human = data.toHuman()
      console.log('toHuman result:', human)

      // Skip None values
      if (human === 'None' || human === null) {
        return undefined
      }

      // Extract Raw value from {Raw: 'value'} structure
      if (human && typeof human === 'object' && human.Raw) {
        if (typeof human.Raw === 'string') {
          const cleaned = human.Raw.trim()
          console.log('Extracted Raw value:', cleaned)
          return cleaned || undefined
        }
      }

      if (typeof human === 'string' && human !== '[object Object]') {
        return human
      }
    }

    // Fallback: Handle Codec types with isRaw/asRaw
    if (data.isRaw) {
      const raw = data.asRaw.toU8a()
      const decoded = new TextDecoder().decode(raw)
      console.log('Decoded isRaw:', decoded)
      return decoded
    }

    // Handle plain Raw wrapper (fallback if toHuman doesn't work)
    if (data.Raw) {
      const bytes = data.Raw
      if (typeof bytes === 'string') {
        // Try to decode hex string
        try {
          const decoded = hexToString(bytes)
          console.log('Decoded hex string:', decoded)
          return decoded
        } catch {
          console.log('Using raw string:', bytes)
          return bytes
        }
      }
      if (bytes instanceof Uint8Array) {
        const decoded = new TextDecoder().decode(bytes)
        console.log('Decoded Uint8Array:', decoded)
        return decoded
      }
    }

    // Handle nested Raw structure
    if (data.value && data.value.Raw) {
      const bytes = data.value.Raw
      if (typeof bytes === 'string') {
        try {
          const decoded = hexToString(bytes)
          console.log('Decoded nested hex:', decoded)
          return decoded
        } catch {
          return bytes
        }
      }
      if (bytes instanceof Uint8Array) {
        return new TextDecoder().decode(bytes)
      }
    }

    // Fallback to string conversion
    const str = data.toString()
    console.log('toString result:', str)
    if (str && str !== '[object Object]' && str !== 'null' && str !== 'None') {
      return str
    }

  } catch (error) {
    console.error('Error decoding identity data:', error, data)
  }

  return undefined
}

/**
 * Check if identity has positive judgement (verified)
 */
function hasPositiveJudgement(judgements: any[]): boolean {
  if (!judgements || judgements.length === 0) return false

  for (const [_, judgement] of judgements) {
    // Check for Reasonable or KnownGood judgements
    if (judgement.isReasonable || judgement.isKnownGood) {
      return true
    }
  }

  return false
}

/**
 * Query on-chain identity from Polkadot People Chain
 */
export async function queryOnChainIdentity(
  address: string
): Promise<{
  success: boolean
  identity?: IdentityInfo
  error?: string
}> {
  try {
    // Skip identity lookup for EVM addresses (0x... format)
    if (address.startsWith('0x') && address.length === 42) {
      console.log('ℹ️ Skipping identity lookup for EVM address:', address)
      return {
        success: false,
        error: 'Identity lookup not available for EVM addresses'
      }
    }

    const api = await getPeopleChainApi()

    console.log('📋 Querying identity for address:', address)

    // Query identity
    const identityResult = await api.query.identity.identityOf(address)

    if (identityResult.isNone) {
      console.log('❌ No identity found')
      return {
        success: false,
        error: 'No on-chain identity found for this address'
      }
    }

    const identity = identityResult.unwrap()
    const info = identity.info
    const judgements = identity.judgements || []

    console.log('✅ Identity found!')
    console.log('Raw identity object:', identity.toJSON())
    console.log('Identity as human readable:', identity.toHuman())
    console.log('Info object:', info)
    console.log('Info as JSON:', info.toJSON())
    console.log('Info as Human:', info.toHuman())
    console.log('Info fields:', Object.keys(info))

    // Log each field with its toHuman value
    console.log('Display:', info.display, '→', info.display?.toHuman?.())
    console.log('Email:', info.email, '→', info.email?.toHuman?.())
    console.log('Twitter:', info.twitter, '→', info.twitter?.toHuman?.())
    console.log('Matrix:', info.matrix, '→', info.matrix?.toHuman?.())
    console.log('Riot (legacy):', info.riot, '→', info.riot?.toHuman?.())
    console.log('Web:', info.web, '→', info.web?.toHuman?.())
    console.log('Legal:', info.legal, '→', info.legal?.toHuman?.())
    console.log('Image:', info.image, '→', info.image?.toHuman?.())
    console.log('Discord:', info.discord, '→', info.discord?.toHuman?.())
    console.log('GitHub:', info.github, '→', info.github?.toHuman?.())
    console.log('Additional:', info.additional, '→', info.additional?.toHuman?.())
    console.log('Judgements:', judgements)

    // Decode all identity fields
    console.log('--- Decoding fields ---')

    // Clean display name - remove leading/trailing commas and whitespace
    const rawDisplay = decodeIdentityData(info.display)
    const cleanDisplay = rawDisplay?.replace(/^[,\s]+|[,\s]+$/g, '').trim()

    // Matrix field - check both new 'matrix' field and legacy 'riot' field
    const matrixValue = decodeIdentityData(info.matrix) || decodeIdentityData(info.riot)

    const identityInfo: IdentityInfo = {
      display: cleanDisplay,
      legal: decodeIdentityData(info.legal),
      email: decodeIdentityData(info.email),
      web: decodeIdentityData(info.web),
      twitter: decodeIdentityData(info.twitter),
      riot: decodeIdentityData(info.riot),
      matrix: matrixValue,
      verified: hasPositiveJudgement(judgements)
    }

    // Check for discord and github - they might be directly on info or in additional
    if (info.discord !== undefined) {
      console.log('Found discord field directly:', info.discord)
      identityInfo.discord = decodeIdentityData(info.discord)
    }

    if (info.github !== undefined) {
      console.log('Found github field directly:', info.github)
      identityInfo.github = decodeIdentityData(info.github)
    }

    // Check additional fields
    if (info.additional) {
      console.log('Processing additional fields...')
      const additional = info.additional.toArray ? info.additional.toArray() : info.additional
      console.log('Additional array:', additional)

      for (const item of additional) {
        console.log('Additional item:', item)

        // Handle tuple format [key, value]
        if (Array.isArray(item) && item.length === 2) {
          const [key, value] = item
          const keyStr = decodeIdentityData(key)?.toLowerCase()
          const valueStr = decodeIdentityData(value)
          console.log(`Additional field: ${keyStr} = ${valueStr}`)

          if (keyStr === 'discord') {
            identityInfo.discord = valueStr
          } else if (keyStr === 'github') {
            identityInfo.github = valueStr
          } else if (keyStr === 'matrix') {
            identityInfo.matrix = valueStr
          }
        }
      }
    }

    console.log('--- Final decoded identity ---')
    console.log('Display:', identityInfo.display)
    console.log('Email:', identityInfo.email)
    console.log('Twitter:', identityInfo.twitter)
    console.log('Matrix:', identityInfo.matrix)
    console.log('Riot:', identityInfo.riot)
    console.log('Discord:', identityInfo.discord)
    console.log('GitHub:', identityInfo.github)
    console.log('Web:', identityInfo.web)
    console.log('Verified:', identityInfo.verified)

    return {
      success: true,
      identity: identityInfo
    }

  } catch (error: any) {
    console.error('❌ Error querying identity:', error)
    let errorMsg = error.message || 'Unknown error'
    if (errorMsg.includes('connect')) {
      errorMsg = 'Failed to connect to Polkadot People Chain. Please check your internet connection.'
    }
    return { success: false, error: errorMsg }
  }
}

/**
 * Disconnect from People Chain (cleanup)
 */
export async function disconnectPeopleChain() {
  if (peopleChainApiInstance) {
    await peopleChainApiInstance.disconnect()
    peopleChainApiInstance = null
  }
}
