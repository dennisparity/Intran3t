export type PollStatus = 'active' | 'closed'
export type VoteChoice = 'aye' | 'nay' | 'abstain'

export interface Vote {
  voter: string // Wallet address
  choice: VoteChoice
  timestamp: number
  signature?: string
  blockNumber?: number
  extrinsicHash?: string
}

export interface Poll {
  id: string
  title: string
  description: string
  creator: string // Wallet address
  createdAt: number
  endsAt: number
  status: PollStatus
  votes: Vote[]
  options?: {
    aye: string
    nay: string
    abstain: string
  }
  // On-chain storage
  remarkHash?: string // Hash of the System Remark that stores this poll
  storedOnChain?: boolean
}

export interface GovernanceConfig {
  title?: string
  description?: string
  showActiveTab?: boolean
  showClosedTab?: boolean
  allowPollCreation?: boolean
  defaultPollDuration?: number // in hours
}
