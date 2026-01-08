import { CheckCircle2, User, Loader2 } from 'lucide-react'
import Identicon from '@polkadot/react-identicon'
import type { UserSearchResult } from '../hooks/useUserSearch'

interface UserSearchResultsProps {
  results: UserSearchResult[]
  isLoading: boolean
  onSelectUser: (address: string) => void
  searchQuery: string
}

export function UserSearchResults({
  results,
  isLoading,
  onSelectUser,
  searchQuery
}: UserSearchResultsProps) {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return null
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e7e5e4] rounded-xl shadow-lg max-h-96 overflow-y-auto z-50">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-6 text-[#78716c]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Searching People Chain identities...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="p-6 text-center text-[#78716c]">
          <p className="text-sm">No users found matching "{searchQuery}"</p>
          <p className="text-xs mt-2 text-[#a8a29e]">
            Try searching by name, email, or address
          </p>
        </div>
      ) : (
        <div className="py-2">
          <div className="px-4 py-2 text-xs font-medium text-[#78716c] border-b border-[#e7e5e4]">
            {results.length} {results.length === 1 ? 'member' : 'members'} found
          </div>
          {results.map((result) => (
            <button
              key={result.address}
              onClick={() => onSelectUser(result.address)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fafaf9] transition-colors border-b border-[#f5f5f4] last:border-0"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Identicon
                  value={result.address}
                  size={40}
                  theme="polkadot"
                  className="rounded-full"
                />
                {result.identity?.verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#1c1917] truncate">
                    {result.identity?.display || 'Unknown'}
                  </h4>
                  {result.identity?.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  )}
                  {result.role === 'admin' && (
                    <span className="px-2 py-0.5 bg-accent-soft text-accent text-xs font-medium rounded-full">
                      Admin
                    </span>
                  )}
                  {result.source === 'discovered' && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-medium rounded-full">
                      People Chain
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#78716c] font-mono truncate">
                  {result.address.slice(0, 8)}...{result.address.slice(-8)}
                </p>
              </div>

              {/* Arrow indicator */}
              <div className="flex-shrink-0">
                <User className="w-4 h-4 text-[#a8a29e]" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
