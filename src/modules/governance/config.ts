import type { Poll, GovernanceConfig } from './types'

// Storage key for polls in localStorage
export const POLLS_STORAGE_KEY = 'intran3t_parity_dao_polls'

export const SAMPLE_POLLS: Poll[] = []

export const BLOCK_DURATION_OPTIONS = [
  { label: '~1 day', blocks: 6_000 },
  { label: '~7 days', blocks: 42_000 },
  { label: '~14 days', blocks: 84_000 },
  { label: '~30 days', blocks: 180_000 },
] as const

export const BULLETIN_GATEWAY = 'https://paseo-bulletin-next-ipfs.polkadot.io/ipfs/'
export const BULLETIN_WS = 'wss://paseo-bulletin-next-rpc.polkadot.io'

export const defaultGovernanceConfig: GovernanceConfig = {
  title: 'Parity DAO',
  description: 'On-chain voting on internal initiatives',
  showActiveTab: true,
  showClosedTab: true,
  allowPollCreation: true,
  defaultPollDuration: 42_000 // ~7 days in blocks
}
