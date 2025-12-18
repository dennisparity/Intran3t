import type { Poll, GovernanceConfig } from './types'

// Storage key for polls in localStorage
export const POLLS_STORAGE_KEY = 'intran3t_parity_dao_polls'

// Sample polls to get started
export const SAMPLE_POLLS: Poll[] = [
  {
    id: 'poll-1',
    title: 'Should we implement dark mode?',
    description: 'Vote to decide if Intran3t should have a dark mode theme option.',
    creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    createdAt: Date.now() - 86400000, // 1 day ago
    endsAt: Date.now() + 86400000 * 6, // 6 days from now
    status: 'active',
    votes: [],
    options: {
      aye: 'Yes, add dark mode',
      nay: 'No, keep light theme only',
      abstain: 'Abstain'
    },
    storedOnChain: false
  }
]

export const defaultGovernanceConfig: GovernanceConfig = {
  title: 'Parity DAO',
  description: 'On-chain voting on internal initiatives',
  showActiveTab: true,
  showClosedTab: true,
  allowPollCreation: true,
  defaultPollDuration: 168 // 7 days in hours
}
