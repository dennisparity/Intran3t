import { useTypink, useBalance } from 'typink'
import Identicon from '@polkadot/react-identicon'
import { User, CheckCircle2, Shield, Users as UsersIcon } from 'lucide-react'
import type { ProfileConfig } from './types'
import { mockUserProfile } from './config'
import { useIdentity } from './use-identity'
import { useState, useEffect } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useEVM } from '../../providers/EVMProvider'
import { useRBACContract, roleToString } from '../../hooks/useRBACContract'

function formatBalance(value: bigint | undefined, decimals: number = 10): string {
  if (!value) return "0";
  const divisor = BigInt(10 ** decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);
  return `${wholePart}.${fractionalStr}`;
}

interface ProfileWidgetProps {
  config: ProfileConfig
  profileAddress?: string  // Address to display (defaults to connected account)
  isOwnProfile?: boolean   // Whether viewing own profile (defaults to true)
}

export function ProfileWidget({
  config,
  profileAddress,
  isOwnProfile = true
}: ProfileWidgetProps) {
  const { connectedAccount, connectedNetworks } = useTypink()
  const { account: evmAccount, provider, signer } = useEVM()
  const [userRole, setUserRole] = useState<string | null>(null)

  // Use profileAddress if provided, otherwise fall back to connectedAccount
  const displayAddress = profileAddress || connectedAccount?.address

  // Get balance
  const network = connectedNetworks?.[0];
  const balance = useBalance(displayAddress || '', {
    networkId: network?.id,
  });

  // Fetch on-chain identity from Polkadot People Chain
  const { data: identity, isLoading: identityLoading } = useIdentity(
    displayAddress
  )

  // RBAC contract hook
  const rbac = useRBACContract(provider, signer)

  // Get orgId from localStorage
  const orgId = localStorage.getItem('intran3t_org_id')

  // Fetch user's role from contract
  useEffect(() => {
    if (!orgId || !rbac.contract || !evmAccount) {
      setUserRole(null)
      return
    }

    const fetchRole = async () => {
      try {
        const { role, hasRole } = await rbac.getUserRole(orgId, evmAccount)
        if (hasRole) {
          setUserRole(roleToString(role))
        } else {
          setUserRole(null)
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
        setUserRole(null)
      }
    }

    fetchRole()
  }, [orgId, rbac, evmAccount])

  // Build profile from real data only - no mock data for connected users
  const profile = displayAddress
    ? {
        address: displayAddress,
        name: identity?.display || 'Unknown User',
        // Only use real identity data if available
        description: identity?.legal || undefined,
        tags: identity ? [] : undefined, // Don't show mock tags
        avatar: undefined // Use Identicon, no custom avatar
      }
    : mockUserProfile

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Viewing Profile Banner */}
      {!isOwnProfile && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-200 text-purple-700 text-xs font-medium rounded-t-2xl">
          Viewing Profile
        </div>
      )}

      <div className="p-6">
        {connectedAccount && config.useOnChainIdentity ? (
        <div className="mb-4">
          {/* Compact Profile Header - Avatar + Identity - Centered */}
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center gap-3 mb-2">
              {/* Profile Picture with Identicon */}
              <div className="relative flex-shrink-0">
                {profile.address ? (
                  <Identicon
                    value={profile.address}
                    size={56}
                    theme="polkadot"
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 bg-[rgba(255,40,103,0.08)] rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 text-[#ff2867]" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#ff2867] rounded-full flex items-center justify-center border-2 border-white">
                  <User className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              {/* Account Info with Identity */}
              <div className="flex-1 min-w-0">
                {identityLoading ? (
                  <div>
                    <h2 className="text-lg font-bold text-[#1c1917] mb-0.5 font-serif">
                      {profile.name}
                    </h2>
                    <p className="text-xs text-[#78716c] font-mono mb-1">
                      {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                    </p>
                    <p className="text-xs text-[#a8a29e] italic">
                      Loading identity...
                    </p>
                  </div>
                ) : identity ? (
                  <div>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="cursor-pointer">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h2 className="text-lg font-bold text-[#1c1917] font-serif truncate">
                              {identity.display || profile.name}
                            </h2>
                            {identity.verified && (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#78716c] font-mono mb-1">
                            {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                          </p>
                        </div>
                      </HoverCardTrigger>
                <HoverCardContent className="w-80 p-4 bg-white" side="bottom">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#e7e5e4]">
                      <h3 className="font-semibold text-sm text-[#1c1917]">
                        On-chain Identity
                      </h3>
                      {identity.verified && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {identity.email && (
                        <div className="flex justify-between">
                          <span className="text-[#78716c]">Email</span>
                          <span className="text-[#1c1917] font-mono">{identity.email}</span>
                        </div>
                      )}
                      {identity.twitter && (
                        <div className="flex justify-between">
                          <span className="text-[#78716c]">Twitter</span>
                          <span className="text-[#1c1917] font-mono">{identity.twitter}</span>
                        </div>
                      )}
                      {identity.github && (
                        <div className="flex justify-between">
                          <span className="text-[#78716c]">GitHub</span>
                          <span className="text-[#1c1917] font-mono">{identity.github}</span>
                        </div>
                      )}
                      {identity.discord && (
                        <div className="flex justify-between">
                          <span className="text-[#78716c]">Discord</span>
                          <span className="text-[#1c1917] font-mono">{identity.discord}</span>
                        </div>
                      )}
                      {identity.matrix && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[#78716c]">Matrix</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[#1c1917] font-mono">{identity.matrix}</span>
                            {identity.verified && (
                              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      )}
                      {identity.web && (
                        <div className="flex justify-between">
                          <span className="text-[#78716c]">Website</span>
                          <span className="text-[#1c1917] font-mono text-blue-600 underline">
                            {identity.web}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
                    </HoverCard>
                    {/* Role & Verification Badges - Visible */}
                    <div className="flex items-center gap-2 mt-1">
                      {/* Role Badge - Only show if role is fetched */}
                      {userRole && (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          userRole === 'Admin'
                            ? 'bg-[rgba(255,40,103,0.08)] border border-[#ff2867]/20 text-[#ff2867]'
                            : userRole === 'People/Culture'
                            ? 'bg-purple-50 border border-purple-200 text-purple-700'
                            : userRole === 'Member'
                            ? 'bg-blue-50 border border-blue-200 text-blue-700'
                            : 'bg-gray-50 border border-gray-200 text-gray-700'
                        }`}>
                          {userRole === 'Admin' && <Shield className="w-3 h-3" />}
                          {userRole === 'People/Culture' && <UsersIcon className="w-3 h-3" />}
                          <span>{userRole}</span>
                        </div>
                      )}
                      {/* Verification Badge */}
                      {identity.verified && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-bold text-[#1c1917] mb-0.5 font-serif">
                      {profile.name}
                    </h2>
                    <p className="text-xs text-[#78716c] font-mono mb-1">
                      {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                    </p>
                    <p className="text-xs text-[#a8a29e] italic">
                      No on-chain identity
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : connectedAccount ? (
        <>
          {/* Compact Profile Header - Avatar + Info - Centered */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-3">
              {/* Profile Picture with Identicon */}
              <div className="relative flex-shrink-0">
                {profile.address ? (
                  <Identicon
                    value={profile.address}
                    size={56}
                    theme="polkadot"
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 bg-[rgba(255,40,103,0.08)] rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 text-[#ff2867]" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#ff2867] rounded-full flex items-center justify-center border-2 border-white">
                  <User className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              {/* Account Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-[#1c1917] mb-0.5 font-serif truncate">
                  {profile.name}
                </h2>
                <p className="text-xs text-[#78716c] font-mono">
                  {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-[#fafaf9] rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-[#78716c]" />
            </div>
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold text-[#1c1917] text-center mb-1 font-serif">
            {profile.name}
          </h2>
        </>
      )}

      {/* Balance */}
      {connectedAccount && (
        <div className="mb-3">
          {balance?.free ? (
            <p className="text-lg font-semibold text-[#ff2867] text-center">
              {formatBalance(balance.free)} PAS
            </p>
          ) : (
            <p className="text-sm text-[#a8a29e] text-center">
              {network ? 'Syncing...' : 'Connecting...'}
            </p>
          )}
        </div>
      )}

      {/* Description */}
      {config.showDescription && profile.description && (
        <p className="text-sm text-[#57534e] text-center mb-4 leading-relaxed">
          {profile.description}
        </p>
      )}

      {/* Tags */}
      {config.showTags && profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {profile.tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-[rgba(255,40,103,0.08)] border border-[#ff2867]/20 text-[#ff2867] text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
