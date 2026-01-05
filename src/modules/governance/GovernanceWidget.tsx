import { useState, useEffect } from 'react'
import { useTypink, useBalance } from 'typink'
import { ThumbsUp, ThumbsDown, Clock, Plus, X, Users, CheckCircle, Minus, Link, HelpCircle } from 'lucide-react'
import type { Poll, Vote, GovernanceConfig, VoteChoice } from './types'
import { SAMPLE_POLLS, POLLS_STORAGE_KEY } from './config'
import { storePollOnChain, storeVoteOnChain, calculatePollHash } from './onchain-storage'
import Identicon from '@polkadot/react-identicon'
import { useIdentity } from '../profile/use-identity'

// Poll storage helpers
function loadPolls(): Poll[] {
  try {
    const stored = localStorage.getItem(POLLS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load polls:', e)
  }
  return SAMPLE_POLLS
}

function savePolls(polls: Poll[]) {
  try {
    localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(polls))
  } catch (e) {
    console.error('Failed to save polls:', e)
  }
}

function getTimeRemaining(endsAt: number): string {
  const now = Date.now()
  const diff = endsAt - now

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

function CreatePollModal({
  onClose,
  onSubmit,
  creatorAddress
}: {
  onClose: () => void
  onSubmit: (poll: Omit<Poll, 'id' | 'votes' | 'status'>) => void
  creatorAddress: string
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ayeOption, setAyeOption] = useState('Aye')
  const [nayOption, setNayOption] = useState('Nay')
  const [abstainOption, setAbstainOption] = useState('Abstain')
  const [duration, setDuration] = useState('168') // 7 days default
  const [storeOnChain, setStoreOnChain] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const now = Date.now()
    const durationMs = parseInt(duration) * 60 * 60 * 1000

    onSubmit({
      title,
      description,
      creator: creatorAddress,
      createdAt: now,
      endsAt: now + durationMs,
      options: {
        aye: ayeOption,
        nay: nayOption,
        abstain: abstainOption
      },
      storedOnChain: storeOnChain
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#e7e5e4]">
          <h2 className="text-2xl font-bold text-[#1c1917] font-serif">
            Create New Poll
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#fafaf9] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#78716c]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Poll Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What should we decide?"
              required
              className="w-full px-4 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about this poll..."
              required
              rows={3}
              className="w-full px-4 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Vote Options (OpenGov style)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#78716c] mb-1">
                  Aye (Support)
                </label>
                <input
                  type="text"
                  value={ayeOption}
                  onChange={(e) => setAyeOption(e.target.value)}
                  placeholder="Aye"
                  required
                  className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs text-[#78716c] mb-1">
                  Nay (Against)
                </label>
                <input
                  type="text"
                  value={nayOption}
                  onChange={(e) => setNayOption(e.target.value)}
                  placeholder="Nay"
                  required
                  className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs text-[#78716c] mb-1">
                  Abstain (Neutral)
                </label>
                <input
                  type="text"
                  value={abstainOption}
                  onChange={(e) => setAbstainOption(e.target.value)}
                  placeholder="Abstain"
                  required
                  className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Duration (hours)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
            >
              <option value="24">1 day</option>
              <option value="72">3 days</option>
              <option value="168">7 days</option>
              <option value="336">14 days</option>
              <option value="720">30 days</option>
            </select>
          </div>

          <div className="bg-[#fafaf9] rounded-lg p-4 border border-[#e7e5e4]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={storeOnChain}
                onChange={(e) => setStoreOnChain(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#ff2867] border-[#e7e5e4] rounded focus:ring-2 focus:ring-[#ff2867]"
              />
              <div>
                <div className="text-sm font-medium text-[#1c1917] flex items-center gap-2">
                  Store on-chain
                  <Link className="w-3.5 h-3.5 text-[#ff2867]" />
                </div>
                <p className="text-xs text-[#78716c] mt-1">
                  Store poll and votes as System Remarks on Paseo AssetHub for permanent, verifiable records
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-polkadot text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Poll
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
  onVote
}: {
  poll: Poll
  userAddress: string
  balance: bigint | undefined
  onClose: () => void
  onVote: (choice: VoteChoice) => void
}) {
  const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null)

  // Fetch on-chain identity
  const { data: identity } = useIdentity(userAddress)

  const formatBalance = (value: bigint | undefined): string => {
    if (!value) return "0"
    const divisor = BigInt(10 ** 10)
    const wholePart = value / divisor
    const fractionalPart = value % divisor
    const fractionalStr = fractionalPart.toString().padStart(10, '0').slice(0, 2)
    return `${wholePart}.${fractionalStr}`
  }

  const handleVote = () => {
    if (selectedVote) {
      onVote(selectedVote)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e7e5e4]">
          <h2 className="text-2xl font-bold text-[#1c1917] font-serif">
            Cast Your Vote
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#fafaf9] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#78716c]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Voting Balance */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-[#78716c]">Voting Balance:</span>
            <span className="text-lg font-bold text-[#1c1917]">
              {formatBalance(balance)} PAS
            </span>
            <button className="p-1 hover:bg-[#fafaf9] rounded-full transition-colors">
              <HelpCircle className="w-4 h-4 text-[#78716c]" />
            </button>
          </div>

          {/* Account Info */}
          <div className="bg-[#fafaf9] rounded-xl p-4 flex items-center justify-between border border-[#e7e5e4]">
            <div className="flex items-center gap-3">
              <Identicon
                value={userAddress}
                size={40}
                theme="polkadot"
              />
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-[#1c1917]">
                    {identity?.display || `${userAddress.slice(0, 6)}...${userAddress.slice(-6)}`}
                  </span>
                </div>
                <span className="text-xs text-[#78716c]">
                  {identity?.display ? 'Verified Identity' : 'Connected Account'}
                </span>
              </div>
            </div>
          </div>

          {/* Poll Info */}
          <div className="bg-gradient-to-br from-[#ff2867]/5 to-[#e6007a]/5 rounded-xl p-4 border border-[#ff2867]/20">
            <h3 className="text-base font-semibold text-[#1c1917] mb-2">
              {poll.title}
            </h3>
            <p className="text-sm text-[#78716c]">
              {poll.description}
            </p>
          </div>

          {/* Choose Your Vote */}
          <div>
            <h3 className="text-base font-semibold text-[#1c1917] mb-3">
              Choose your Vote
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Aye */}
              <button
                onClick={() => setSelectedVote('aye')}
                className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                  selectedVote === 'aye'
                    ? 'bg-green-50 border-green-500 shadow-lg shadow-green-100'
                    : 'bg-white border-[#e7e5e4] hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <ThumbsUp className={`w-8 h-8 ${selectedVote === 'aye' ? 'text-green-600' : 'text-[#78716c]'}`} />
                <span className={`text-sm font-semibold ${selectedVote === 'aye' ? 'text-green-700' : 'text-[#1c1917]'}`}>
                  {poll.options?.aye || 'Aye'}
                </span>
              </button>

              {/* Nay */}
              <button
                onClick={() => setSelectedVote('nay')}
                className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                  selectedVote === 'nay'
                    ? 'bg-red-50 border-red-500 shadow-lg shadow-red-100'
                    : 'bg-white border-[#e7e5e4] hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <ThumbsDown className={`w-8 h-8 ${selectedVote === 'nay' ? 'text-red-600' : 'text-[#78716c]'}`} />
                <span className={`text-sm font-semibold ${selectedVote === 'nay' ? 'text-red-700' : 'text-[#1c1917]'}`}>
                  {poll.options?.nay || 'Nay'}
                </span>
              </button>

              {/* Abstain */}
              <button
                onClick={() => setSelectedVote('abstain')}
                className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                  selectedVote === 'abstain'
                    ? 'bg-gray-50 border-gray-500 shadow-lg shadow-gray-100'
                    : 'bg-white border-[#e7e5e4] hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <Minus className={`w-8 h-8 ${selectedVote === 'abstain' ? 'text-gray-600' : 'text-[#78716c]'}`} />
                <span className={`text-sm font-semibold ${selectedVote === 'abstain' ? 'text-gray-700' : 'text-[#1c1917]'}`}>
                  {poll.options?.abstain || 'Abstain'}
                </span>
              </button>
            </div>
          </div>

          {/* Vote Button */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleVote}
              disabled={!selectedVote}
              className="flex-1 px-6 py-3 bg-grey-900 text-white rounded-xl hover:bg-grey-800 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedVote ? `Vote ${poll.options?.[selectedVote] || selectedVote}` : 'Select an option'}
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
  onOpenVote
}: {
  poll: Poll
  userAddress?: string
  onOpenVote: (poll: Poll) => void
}) {
  const ayeVotes = poll.votes.filter(v => v.choice === 'aye').length
  const nayVotes = poll.votes.filter(v => v.choice === 'nay').length
  const abstainVotes = poll.votes.filter(v => v.choice === 'abstain').length
  const totalVotes = ayeVotes + nayVotes + abstainVotes
  const ayePercent = totalVotes > 0 ? (ayeVotes / totalVotes) * 100 : 0
  const nayPercent = totalVotes > 0 ? (nayVotes / totalVotes) * 100 : 0
  const abstainPercent = totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0

  const userVote = userAddress ? poll.votes.find(v => v.voter === userAddress) : null
  const hasVoted = !!userVote
  const isPollActive = poll.status === 'active' && Date.now() < poll.endsAt
  const canVote = isPollActive && userAddress && !hasVoted

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl p-4 hover:border-[#d6d3d1] transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              isPollActive
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
            }`}>
              {isPollActive ? 'Active' : 'Closed'}
            </span>
            {poll.storedOnChain && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Link className="w-3 h-3" />
                On-chain
              </span>
            )}
            {hasVoted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Voted
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[#1c1917] mb-1">
            {poll.title}
          </h3>
          <p className="text-xs text-[#78716c] line-clamp-2">{poll.description}</p>
        </div>
      </div>

      {/* Vote Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#78716c]">Votes</span>
          <span className="text-[#1c1917] font-medium">{totalVotes} total</span>
        </div>
        <div className="h-2 bg-[#fafaf9] rounded-full overflow-hidden flex">
          <div
            className="bg-green-500"
            style={{ width: `${ayePercent}%` }}
          />
          <div
            className="bg-red-500"
            style={{ width: `${nayPercent}%` }}
          />
          <div
            className="bg-gray-400"
            style={{ width: `${abstainPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-2 gap-2">
          <span className="text-green-600 flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            <span className="truncate">{poll.options?.aye || 'Aye'}: {ayeVotes}</span>
          </span>
          <span className="text-red-600 flex items-center gap-1">
            <ThumbsDown className="w-3 h-3" />
            <span className="truncate">{poll.options?.nay || 'Nay'}: {nayVotes}</span>
          </span>
          <span className="text-gray-600 flex items-center gap-1">
            <Minus className="w-3 h-3" />
            <span className="truncate">{poll.options?.abstain || 'Abstain'}: {abstainVotes}</span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e7e5e4]">
        <div className="flex items-center gap-1 text-xs text-[#78716c]">
          <Clock className="w-3 h-3" />
          <span>{getTimeRemaining(poll.endsAt)}</span>
        </div>
        {canVote ? (
          <button
            onClick={() => onOpenVote(poll)}
            className="px-4 py-2 bg-grey-900 text-white text-xs font-medium rounded-xl hover:bg-grey-800 transition-colors duration-200"
          >
            Vote Now
          </button>
        ) : hasVoted ? (
          <span className="text-xs text-[#78716c]">
            You voted: <span className="font-medium text-[#1c1917]">
              {userVote?.choice === 'aye'
                ? poll.options?.aye || 'Aye'
                : userVote?.choice === 'nay'
                ? poll.options?.nay || 'Nay'
                : poll.options?.abstain || 'Abstain'}
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
  const { connectedAccount, connectedNetworks } = useTypink()
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active')
  const [polls, setPolls] = useState<Poll[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [votingPoll, setVotingPoll] = useState<Poll | null>(null)

  // Get balance
  const network = connectedNetworks?.[0]
  const balance = useBalance(connectedAccount?.address || '', {
    networkId: network?.id,
  })

  // Load polls on mount
  useEffect(() => {
    setPolls(loadPolls())
  }, [])

  // Update poll statuses
  useEffect(() => {
    const now = Date.now()
    const updated = polls.map(poll => ({
      ...poll,
      status: (now >= poll.endsAt ? 'closed' : 'active') as Poll['status']
    }))

    if (JSON.stringify(updated) !== JSON.stringify(polls)) {
      setPolls(updated)
      savePolls(updated)
    }
  }, [polls])

  const handleCreatePoll = async (pollData: Omit<Poll, 'id' | 'votes' | 'status'>) => {
    const newPoll: Poll = {
      ...pollData,
      id: `poll-${Date.now()}`,
      votes: [],
      status: 'active'
    }

    // Store on-chain if requested
    if (pollData.storedOnChain && connectedAccount) {
      try {
        const hash = await storePollOnChain(newPoll, connectedAccount)
        newPoll.remarkHash = hash
        console.log('Poll stored on-chain with hash:', hash)
      } catch (e) {
        console.error('Failed to store poll on-chain:', e)
        // Continue with local storage even if on-chain fails
      }
    }

    const updatedPolls = [newPoll, ...polls]
    setPolls(updatedPolls)
    savePolls(updatedPolls)
    setShowCreateModal(false)
  }

  const handleVote = async (pollId: string, choice: VoteChoice) => {
    if (!connectedAccount) return

    const poll = polls.find(p => p.id === pollId)
    if (!poll) return

    const vote: Vote = {
      voter: connectedAccount.address,
      choice,
      timestamp: Date.now()
    }

    // Store vote on-chain if poll is stored on-chain
    if (poll.storedOnChain) {
      try {
        const hash = await storeVoteOnChain(vote, pollId, connectedAccount)
        vote.extrinsicHash = hash
        console.log('Vote stored on-chain with hash:', hash)
      } catch (e) {
        console.error('Failed to store vote on-chain:', e)
        // Continue with local storage even if on-chain fails
      }
    }

    const updatedPolls = polls.map(p => {
      if (p.id === pollId) {
        // Check if user already voted
        if (p.votes.some(v => v.voter === connectedAccount.address)) {
          return p
        }
        return {
          ...p,
          votes: [...p.votes, vote]
        }
      }
      return p
    })

    setPolls(updatedPolls)
    savePolls(updatedPolls)
  }

  const activePolls = polls.filter(p => p.status === 'active')
  const closedPolls = polls.filter(p => p.status === 'closed')
  const displayedPolls = activeTab === 'active' ? activePolls : closedPolls

  return (
    <>
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 h-full flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1c1917] font-serif mb-1">
              {config.title || 'Parity DAO'}
            </h2>
            {config.description && (
              <p className="text-xs text-[#78716c]">
                {config.description}
              </p>
            )}
          </div>
          {config.allowPollCreation && connectedAccount && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-grey-900 text-white text-xs font-medium rounded-xl hover:bg-grey-800 transition-colors duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              New Poll
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[#fafaf9] p-1 rounded-lg">
          {config.showActiveTab !== false && (
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
                activeTab === 'active'
                  ? 'bg-white text-[#1c1917] shadow-sm'
                  : 'text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              Active ({activePolls.length})
            </button>
          )}
          {config.showClosedTab !== false && (
            <button
              onClick={() => setActiveTab('closed')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
                activeTab === 'closed'
                  ? 'bg-white text-[#1c1917] shadow-sm'
                  : 'text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              Closed ({closedPolls.length})
            </button>
          )}
        </div>

        {/* Polls List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {displayedPolls.length > 0 ? (
            displayedPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                userAddress={connectedAccount?.address}
                onOpenVote={setVotingPoll}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 text-[#d6d3d1]" />
                <p className="text-sm text-[#78716c]">
                  {activeTab === 'active' ? 'No active polls' : 'No closed polls'}
                </p>
                {config.allowPollCreation && connectedAccount && activeTab === 'active' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-xs text-[#ff2867] hover:text-[#e6007a] transition-colors"
                  >
                    Create the first poll
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && connectedAccount && (
        <CreatePollModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePoll}
          creatorAddress={connectedAccount.address}
        />
      )}

      {votingPoll && connectedAccount && (
        <VoteModal
          poll={votingPoll}
          userAddress={connectedAccount.address}
          balance={balance?.free}
          onClose={() => setVotingPoll(null)}
          onVote={(choice) => {
            handleVote(votingPoll.id, choice)
            setVotingPoll(null)
          }}
        />
      )}
    </>
  )
}
