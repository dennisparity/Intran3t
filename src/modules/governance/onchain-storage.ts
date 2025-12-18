import type { Poll, Vote } from './types'

/**
 * On-chain storage helpers using System Remarks
 *
 * System Remarks allow storing arbitrary data in blockchain extrinsics.
 * This provides permanent, verifiable, and censorship-resistant storage.
 *
 * Storage Strategy:
 * 1. Store poll creation as a System Remark
 * 2. Store each vote as a separate System Remark
 * 3. Reference original poll by hash
 *
 * Data Format (stored as bytes in System Remark):
 * {
 *   type: 'parity_dao_poll' | 'parity_dao_vote',
 *   version: 1,
 *   data: Poll | Vote
 * }
 */

export interface OnChainRecord {
  type: 'parity_dao_poll' | 'parity_dao_vote'
  version: number
  data: Poll | Vote
}

/**
 * Convert poll/vote to bytes for System Remark
 */
export function encodeForRemark(record: OnChainRecord): Uint8Array {
  const json = JSON.stringify(record)
  return new TextEncoder().encode(json)
}

/**
 * Decode bytes from System Remark back to poll/vote
 */
export function decodeFromRemark(bytes: Uint8Array): OnChainRecord | null {
  try {
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as OnChainRecord
  } catch (e) {
    console.error('Failed to decode remark:', e)
    return null
  }
}

/**
 * Store poll on-chain using System Remark
 *
 * @param poll - The poll to store
 * @param signer - Connected account for signing
 * @returns Promise with extrinsic hash
 */
export async function storePollOnChain(
  poll: Poll,
  signer: any // TypedApi signer from PAPI
): Promise<string> {
  const record: OnChainRecord = {
    type: 'parity_dao_poll',
    version: 1,
    data: poll
  }

  const remarkData = encodeForRemark(record)

  // TODO: Implement PAPI transaction
  // const api = await createClient()
  // const tx = api.tx.System.remark({ remark: remarkData })
  // const result = await tx.signAndSubmit(signer)
  // return result.txHash

  // Placeholder - return mock hash
  console.log('Would store poll on-chain:', poll.title)
  return `0x${Math.random().toString(16).substring(2)}`
}

/**
 * Store vote on-chain using System Remark
 *
 * @param vote - The vote to store
 * @param pollId - ID of the poll being voted on
 * @param signer - Connected account for signing
 * @returns Promise with extrinsic hash
 */
export async function storeVoteOnChain(
  vote: Vote,
  pollId: string,
  signer: any
): Promise<string> {
  const record: OnChainRecord = {
    type: 'parity_dao_vote',
    version: 1,
    data: {
      ...vote,
      // Include poll reference in vote data
      pollId
    } as any
  }

  const remarkData = encodeForRemark(record)

  // TODO: Implement PAPI transaction
  // const api = await createClient()
  // const tx = api.tx.System.remark({ remark: remarkData })
  // const result = await tx.signAndSubmit(signer)
  // return result.txHash

  // Placeholder - return mock hash
  console.log('Would store vote on-chain:', vote.voter, vote.choice)
  return `0x${Math.random().toString(16).substring(2)}`
}

/**
 * Query all polls from chain by scanning System Remarks
 *
 * @returns Promise with array of polls
 */
export async function queryPollsFromChain(): Promise<Poll[]> {
  // TODO: Implement chain scanning
  // 1. Query recent blocks
  // 2. Filter System.remark extrinsics
  // 3. Decode and filter for parity_dao_poll type
  // 4. Return decoded polls

  console.log('Would query polls from chain')
  return []
}

/**
 * Query votes for a specific poll from chain
 *
 * @param pollId - The poll ID to query votes for
 * @returns Promise with array of votes
 */
export async function queryVotesFromChain(pollId: string): Promise<Vote[]> {
  // TODO: Implement chain scanning
  // 1. Query recent blocks
  // 2. Filter System.remark extrinsics
  // 3. Decode and filter for parity_dao_vote type matching pollId
  // 4. Return decoded votes

  console.log('Would query votes for poll:', pollId)
  return []
}

/**
 * Calculate hash of poll data for reference
 */
export function calculatePollHash(poll: Poll): string {
  const data = JSON.stringify({
    id: poll.id,
    title: poll.title,
    creator: poll.creator,
    createdAt: poll.createdAt
  })

  // Simple hash for now - in production use proper hash function
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return `0x${Math.abs(hash).toString(16)}`
}
