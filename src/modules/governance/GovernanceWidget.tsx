import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../../providers/WalletProvider'
import { ThumbsUp, ThumbsDown, Clock, Plus, X, Users, CheckCircle, Minus, Link, HelpCircle, Loader2, Scale } from 'lucide-react'
import type { Poll, Vote, GovernanceConfig, VoteChoice } from './types'
import { SAMPLE_POLLS, POLLS_STORAGE_KEY, BLOCK_DURATION_OPTIONS, BULLETIN_GATEWAY, BULLETIN_WS } from './config'
import Identicon from '@polkadot/react-identicon'
import { useIdentity } from '../profile/use-identity'
import { useParityDAOContract, VOTE_CHOICE } from '../../hooks/useParityDAOContract'
import { uploadJsonToBulletin } from '../../lib/bulletin/upload'
import { useBalance } from 'typink'

const CHOICE_MAP: Record<VoteChoice, number> = {
  aye: VOTE_CHOICE.Aye,
  nay: VOTE_CHOICE.Nay,
  abstain: VOTE_CHOICE.Abstain,
}

function loadLocalPolls(): Poll[] {
  try {
    const stored = localStorage.getItem(POLLS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return SAMPLE_POLLS
}

function getBlocksRemaining(endBlock: number, currentBlock: number): string {
  const left = endBlock - currentBlock
  if (left <= 0) return 'Ended'
  if (left > 42000) return `~${Math.round(left / 6000)}d`
  if (left > 6000) return `~${Math.round(left / 6000)}d (${left.toLocaleString()} blocks)`
  return `${left.toLocaleString()} blocks`
}

function getTimeRemaining(endsAt: number): string {
  const diff = endsAt - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

function CreatePollModal({
  onClose,
  onSubmit,
  creatorAddress,
  isSubmitting,
  submitStatus
}: {
  onClose: () => void
  onSubmit: (title: string, description: string, durationBlocks: number) => void
  creatorAddress: string
  isSubmitting: boolean
  submitStatus: string
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationBlocks, setDurationBlocks] = useState(String(BLOCK_DURATION_OPTIONS[1].blocks))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(title, description, parseInt(durationBlocks))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#e7e5e4]">
          <h2 className="text-2xl font-bold text-[#1c1917] font-serif">
            Create New Proposal
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#fafaf9] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#78716c]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What should we decide?"
              required
              className="w-full px-4 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c1917]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details..."
              required
              rows={3}
              className="w-full px-4 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c1917]/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">Voting Duration</label>
            <select
              value={durationBlocks}
              onChange={(e) => setDurationBlocks(e.target.value)}
              className="w-full px-4 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c1917]/20"
            >
              {BLOCK_DURATION_OPTIONS.map((opt) => (
                <option key={opt.blocks} value={opt.blocks}>
                  {opt.label} ({opt.blocks.toLocaleString()} blocks)
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[#fafaf9] rounded-lg p-3 border border-[#e7e5e4] flex items-center gap-2">
            <Link className="w-4 h-4 text-purple-600 shrink-0" />
            <p className="text-xs text-[#78716c]">
              Content stored on Bulletin Chain, vote registry on Paseo Asset Hub
            </p>
          </div>

          {submitStatus && (
            <div className="flex items-center gap-2 text-sm text-[#78716c]">
              <Loader2 className="w-4 h-4 animate-spin" />
              {submitStatus}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VoteModal({
  poll,
  userAddress,
  balance,
  onClose,
  onVote,
  isVoting,
  voteStatus
}: {
  poll: Poll
  userAddress: string
  balance: bigint | undefined
  onClose: () => void
  onVote: (choice: VoteChoice, comment: string) => void
  isVoting: boolean
  voteStatus: string
}) {
  const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null)
  const [comment, setComment] = useState('')
  const { data: identity } = useIdentity(userAddress)

  const formatBalance = (value: bigint | undefined): string => {
    if (!value) return "0"
    const divisor = BigInt(10 ** 10)
    const wholePart = value / divisor
    const fractionalPart = value % divisor
    const fractionalStr = fractionalPart.toString().padStart(10, '0').slice(0, 2)
    return `${wholePart}.${fractionalStr}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#e7e5e4]">
          <h2 className="text-2xl font-bold text-[#1c1917] font-serif">Cast Your Vote</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#fafaf9] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#78716c]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-[#78716c]">Voting Balance:</span>
            <span className="text-lg font-bold text-[#1c1917]">{formatBalance(balance)} PAS</span>
            <button className="p-1 hover:bg-[#fafaf9] rounded-full transition-colors">
              <HelpCircle className="w-4 h-4 text-[#78716c]" />
            </button>
          </div>

          <div className="bg-[#fafaf9] rounded-xl p-4 flex items-center gap-3 border border-[#e7e5e4]">
            <Identicon value={userAddress} size={40} theme="polkadot" />
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-[#1c1917]">
                  {identity?.display || `${userAddress.slice(0, 6)}...${userAddress.slice(-6)}`}
                </span>
              </div>
              <span className="text-xs text-[#78716c]">{identity?.display ? 'Verified Identity' : 'Connected Account'}</span>
            </div>
          </div>

          <div className="bg-[#fafaf9] rounded-xl p-4 border border-[#e7e5e4]">
            <h3 className="text-base font-semibold text-[#1c1917] mb-1">{poll.title}</h3>
            <p className="text-sm text-[#78716c]">{poll.description}</p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#1c1917] mb-3">Choose your Vote</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedVote('aye')}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                  selectedVote === 'aye' ? 'bg-green-50 border-green-500 shadow-lg shadow-green-100' : 'bg-white border-[#e7e5e4] hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <ThumbsUp className={`w-8 h-8 ${selectedVote === 'aye' ? 'text-green-600' : 'text-[#78716c]'}`} />
                <span className={`text-sm font-semibold ${selectedVote === 'aye' ? 'text-green-700' : 'text-[#1c1917]'}`}>Aye</span>
              </button>
              <button
                onClick={() => setSelectedVote('nay')}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                  selectedVote === 'nay' ? 'bg-red-50 border-red-500 shadow-lg shadow-red-100' : 'bg-white border-[#e7e5e4] hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <ThumbsDown className={`w-8 h-8 ${selectedVote === 'nay' ? 'text-red-600' : 'text-[#78716c]'}`} />
                <span className={`text-sm font-semibold ${selectedVote === 'nay' ? 'text-red-700' : 'text-[#1c1917]'}`}>Nay</span>
              </button>
              <button
                onClick={() => setSelectedVote('abstain')}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                  selectedVote === 'abstain' ? 'bg-gray-50 border-gray-500 shadow-lg shadow-gray-100' : 'bg-white border-[#e7e5e4] hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <Minus className={`w-8 h-8 ${selectedVote === 'abstain' ? 'text-gray-600' : 'text-[#78716c]'}`} />
                <span className={`text-sm font-semibold ${selectedVote === 'abstain' ? 'text-gray-700' : 'text-[#1c1917]'}`}>Abstain</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Comment <span className="text-[#78716c] font-normal">(optional, stored on-chain)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 280))}
              placeholder="Add a reason for your vote..."
              rows={2}
              className="w-full px-4 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c1917]/20 resize-none text-sm"
            />
            <p className="text-xs text-[#78716c] text-right mt-1">{comment.length}/280</p>
          </div>

          {voteStatus && (
            <div className="flex items-center gap-2 text-sm text-[#78716c]">
              <Loader2 className="w-4 h-4 animate-spin" />
              {voteStatus}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={isVoting}
              className="flex-1 px-6 py-3 border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedVote && onVote(selectedVote, comment)}
              disabled={!selectedVote || isVoting}
              className="flex-1 px-6 py-3 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVoting ? <><Loader2 className="w-4 h-4 animate-spin" /> Voting...</> : selectedVote ? `Vote ${selectedVote.charAt(0).toUpperCase() + selectedVote.slice(1)}` : 'Select an option'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PollCard({
  poll,
  userAddress,
  hasVotedOnChain,
  currentBlock,
  onOpenVote
}: {
  poll: Poll
  userAddress?: string
  hasVotedOnChain?: boolean
  currentBlock?: number
  onOpenVote: (poll: Poll) => void
}) {
  const ayeVotes = poll.votes.filter(v => v.choice === 'aye').length
  const nayVotes = poll.votes.filter(v => v.choice === 'nay').length
  const abstainVotes = poll.votes.filter(v => v.choice === 'abstain').length
  const totalVotes = ayeVotes + nayVotes + abstainVotes

  // For on-chain proposals, status is derived from block number
  const isOnChain = poll.onChainId !== undefined
  const isPollActive = isOnChain
    ? (currentBlock !== undefined && poll.endBlock !== undefined
        ? currentBlock <= poll.endBlock
        : poll.status === 'active')
    : poll.status === 'active' && Date.now() < poll.endsAt

  // Determine if results should be shown
  const userVote = userAddress ? poll.votes.find(v => v.voter === userAddress) : null
  const localHasVoted = !!userVote
  const showResults = localHasVoted || hasVotedOnChain || !isPollActive

  const canVote = isPollActive && userAddress && !localHasVoted && !hasVotedOnChain

  const ayePercent = totalVotes > 0 ? (ayeVotes / totalVotes) * 100 : 0
  const nayPercent = totalVotes > 0 ? (nayVotes / totalVotes) * 100 : 0
  const abstainPercent = totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0

  const timeLabel = isOnChain && poll.endBlock && currentBlock
    ? getBlocksRemaining(poll.endBlock, currentBlock)
    : getTimeRemaining(poll.endsAt)

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl p-4 hover:border-[#d6d3d1] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              isPollActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'
            }`}>
              {isPollActive ? 'Active' : 'Closed'}
            </span>
            {isOnChain && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Link className="w-3 h-3" />
                On-chain
              </span>
            )}
            {(localHasVoted || hasVotedOnChain) && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Voted
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[#1c1917] mb-1">{poll.title}</h3>
          <p className="text-xs text-[#78716c] line-clamp-2">{poll.description}</p>
        </div>
      </div>

      <div className="mb-3">
        {showResults ? (
          <>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#78716c]">Votes</span>
              <span className="text-[#1c1917] font-medium">{totalVotes} total</span>
            </div>
            <div className="h-2 bg-[#fafaf9] rounded-full overflow-hidden flex">
              <div className="bg-green-500" style={{ width: `${ayePercent}%` }} />
              <div className="bg-red-500" style={{ width: `${nayPercent}%` }} />
              <div className="bg-gray-400" style={{ width: `${abstainPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-2 gap-2">
              <span className="text-green-600 flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                <span>Aye: {ayeVotes}</span>
              </span>
              <span className="text-red-600 flex items-center gap-1">
                <ThumbsDown className="w-3 h-3" />
                <span>Nay: {nayVotes}</span>
              </span>
              <span className="text-gray-600 flex items-center gap-1">
                <Minus className="w-3 h-3" />
                <span>Abstain: {abstainVotes}</span>
              </span>
            </div>
          </>
        ) : (
          <div className="h-12 flex items-center justify-center bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
            <p className="text-xs text-[#78716c]">Cast your vote to see results</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#e7e5e4]">
        <div className="flex items-center gap-1 text-xs text-[#78716c]">
          <Clock className="w-3 h-3" />
          <span>{timeLabel}</span>
        </div>
        {canVote ? (
          <button
            onClick={() => onOpenVote(poll)}
            className="px-4 py-2 bg-[#1c1917] text-white text-xs font-medium rounded-xl hover:bg-[#292524] transition-colors"
          >
            Vote Now
          </button>
        ) : (localHasVoted || hasVotedOnChain) ? (
          <span className="text-xs text-[#78716c]">
            You voted: <span className="font-medium text-[#1c1917]">
              {userVote?.choice ? userVote.choice.charAt(0).toUpperCase() + userVote.choice.slice(1) : 'On-chain'}
            </span>
          </span>
        ) : !isPollActive ? (
          <span className="text-xs text-[#a8a29e]">Poll ended</span>
        ) : (
          <span className="text-xs text-[#a8a29e]">Connect wallet to vote</span>
        )}
      </div>
    </div>
  )
}

export function GovernanceWidget({ config }: { config: GovernanceConfig }) {
  const { selectedAccount } = useWallet()
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active')
  const [polls, setPolls] = useState<Poll[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [votingPoll, setVotingPoll] = useState<Poll | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createStatus, setCreateStatus] = useState('')
  const [isVoting, setIsVoting] = useState(false)
  const [voteStatus, setVoteStatus] = useState('')
  const [hasVotedMap, setHasVotedMap] = useState<Record<string, boolean>>({})
  const [currentBlock, setCurrentBlock] = useState<number | undefined>()
  const [loadingChain, setLoadingChain] = useState(false)

  const balance = useBalance(selectedAccount?.address || '', { enabled: !!selectedAccount?.address })

  const daoContract = useParityDAOContract()

  // Load proposals from contract + local fallback on mount
  const loadProposals = useCallback(async () => {
    setLoadingChain(true)
    try {
      const count = await daoContract.getProposalCount()

      if (count === 0) {
        setPolls([])
        setLoadingChain(false)
        return
      }

      const proposalDataList = await Promise.all(
        Array.from({ length: count }, (_, i) => daoContract.getProposal(i))
      )

      const onChainPolls: Poll[] = await Promise.all(
        proposalDataList.map(async (p, i) => {
          let title = `Proposal #${i}`
          let description = ''
          try {
            const res = await fetch(`${BULLETIN_GATEWAY}${p.contentCid}`)
            if (res.ok) {
              const json = await res.json()
              title = json.title || title
              description = json.description || ''
            }
          } catch {}

          const isActive = await daoContract.isActive(i)
          return {
            id: `onchain-${i}`,
            onChainId: i,
            title,
            description,
            creator: p.author,
            contentCid: p.contentCid,
            createdAt: 0,
            endsAt: 0,
            endBlock: p.endBlock,
            status: isActive ? 'active' : 'closed',
            votes: [],
            storedOnChain: true,
            ayeCount: p.ayeCount,
            nayCount: p.nayCount,
            abstainCount: p.abstainCount,
          } as Poll & { ayeCount: number; nayCount: number; abstainCount: number }
        })
      )

      // Merge on-chain vote counts into the votes array shape
      const normalizedPolls: Poll[] = onChainPolls.map((p: any) => ({
        ...p,
        votes: [
          ...Array(p.ayeCount).fill({ voter: '__chain__', choice: 'aye', timestamp: 0 }),
          ...Array(p.nayCount).fill({ voter: '__chain__', choice: 'nay', timestamp: 0 }),
          ...Array(p.abstainCount).fill({ voter: '__chain__', choice: 'abstain', timestamp: 0 }),
        ],
      }))

      setPolls(normalizedPolls)

      // Check hasVoted for connected user
      if (daoContract.evmAddress) {
        const votedResults = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            daoContract.hasVotedOnChain(i, daoContract.evmAddress!)
          )
        )
        const map: Record<string, boolean> = {}
        votedResults.forEach((voted, i) => {
          map[`onchain-${i}`] = voted
        })
        setHasVotedMap(map)
      }

    } catch (err) {
      console.error('[GovernanceWidget] Failed to load chain proposals:', err)
      setPolls([])
    } finally {
      setLoadingChain(false)
    }
  }, [daoContract])

  useEffect(() => {
    loadProposals()
  }, [daoContract.evmAddress])

  // Fetch current block number for block-based countdown
  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const { ethers } = await import('ethers')
        const provider = new ethers.JsonRpcProvider('https://eth-rpc-testnet.polkadot.io')
        const block = await provider.getBlockNumber()
        setCurrentBlock(block)
      } catch {}
    }
    fetchBlock()
  }, [])

  const handleCreatePoll = async (title: string, description: string, durationBlocks: number) => {
    if (!selectedAccount) return
    setIsCreating(true)

    try {
      setCreateStatus('Uploading content to Bulletin...')
      const result = await uploadJsonToBulletin(
        { title, description },
        { bulletinEndpoint: BULLETIN_WS, ipfsGateway: BULLETIN_GATEWAY }
      )

      setCreateStatus('Creating proposal on-chain...')
      const proposalId = await daoContract.createProposal(
        result.cid,
        durationBlocks,
        (stage) => {
          if (stage === 'in_block') setCreateStatus('Included in block, finalizing...')
        }
      )

      setCreateStatus('Proposal created!')
      setShowCreateModal(false)
      await loadProposals()
    } catch (err) {
      console.error('[GovernanceWidget] Create failed:', err)
      setCreateStatus('')
    } finally {
      setIsCreating(false)
      setCreateStatus('')
    }
  }

  const handleVote = async (pollId: string, choice: VoteChoice, comment: string) => {
    if (!selectedAccount) return
    const poll = polls.find(p => p.id === pollId)
    if (!poll || poll.onChainId === undefined) return

    setIsVoting(true)
    try {
      setVoteStatus('Signing transaction...')
      await daoContract.castVote(
        poll.onChainId,
        CHOICE_MAP[choice] as 1 | 2 | 3,
        comment,
        (stage) => {
          if (stage === 'in_block') setVoteStatus('Included in block, finalizing...')
        }
      )

      setHasVotedMap(prev => ({ ...prev, [pollId]: true }))
      setVotingPoll(null)

      // Reload to get updated counts
      await loadProposals()
    } catch (err) {
      console.error('[GovernanceWidget] Vote failed:', err)
    } finally {
      setIsVoting(false)
      setVoteStatus('')
    }
  }

  const activePolls = polls.filter(p => p.status === 'active')
  const closedPolls = polls.filter(p => p.status === 'closed')
  const displayedPolls = activeTab === 'active' ? activePolls : closedPolls

  return (
    <>
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 h-full flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1c1917] font-serif mb-1">
              {config.title || 'Parity DAO'}
            </h2>
            {config.description && (
              <p className="text-xs text-[#78716c]">{config.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {config.allowPollCreation && selectedAccount && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#1c1917] text-white text-xs font-medium rounded-xl hover:bg-[#292524] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Proposal
              </button>
            )}
            <Scale className="w-5 h-5 text-[#78716c] flex-shrink-0" />
          </div>
        </div>

        <div className="flex gap-1 mb-4 bg-[#fafaf9] p-1 rounded-lg">
          {config.showActiveTab !== false && (
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
                activeTab === 'active' ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              Active ({activePolls.length})
            </button>
          )}
          {config.showClosedTab !== false && (
            <button
              onClick={() => setActiveTab('closed')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
                activeTab === 'closed' ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              Closed ({closedPolls.length})
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loadingChain ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#d6d3d1] animate-spin" />
                <p className="text-sm text-[#78716c]">Loading proposals...</p>
              </div>
            </div>
          ) : displayedPolls.length > 0 ? (
            displayedPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                userAddress={selectedAccount?.address}
                hasVotedOnChain={hasVotedMap[poll.id]}
                currentBlock={currentBlock}
                onOpenVote={setVotingPoll}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 text-[#d6d3d1]" />
                <p className="text-sm text-[#78716c]">
                  {activeTab === 'active' ? 'No active proposals' : 'No closed proposals'}
                </p>
                {config.allowPollCreation && selectedAccount && activeTab === 'active' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-xs text-[#1c1917] hover:text-[#292524] transition-colors"
                  >
                    Create the first proposal
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && selectedAccount && (
        <CreatePollModal
          onClose={() => { if (!isCreating) setShowCreateModal(false) }}
          onSubmit={handleCreatePoll}
          creatorAddress={selectedAccount.address}
          isSubmitting={isCreating}
          submitStatus={createStatus}
        />
      )}

      {votingPoll && selectedAccount && (
        <VoteModal
          poll={votingPoll}
          userAddress={selectedAccount.address}
          balance={balance?.free}
          onClose={() => { if (!isVoting) setVotingPoll(null) }}
          onVote={(choice, comment) => handleVote(votingPoll.id, choice, comment)}
          isVoting={isVoting}
          voteStatus={voteStatus}
        />
      )}
    </>
  )
}
