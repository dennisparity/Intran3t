import { useTypink, useBalance } from 'typink'
import { useNavigate } from 'react-router-dom'
import Identicon from '@polkadot/react-identicon'
import { User, LogOut, Copy, Check, CheckCircle2, Mail, Twitter, MessageCircle, Github } from 'lucide-react'
import type { ProfileConfig } from './types'
import { mockUserProfile } from './config'
import { useIdentity } from './use-identity'
import { useState } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

function formatBalance(value: bigint | undefined, decimals: number = 10): string {
  if (!value) return "0";
  const divisor = BigInt(10 ** decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);
  return `${wholePart}.${fractionalStr}`;
}

export function ProfileWidget({ config }: { config: ProfileConfig }) {
  const { connectedAccount, disconnect, connectedNetworks } = useTypink()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  // Get balance
  const network = connectedNetworks?.[0];
  const balance = useBalance(connectedAccount?.address || '', {
    networkId: network?.id,
  });

  // Fetch on-chain identity from Polkadot People Chain
  const { data: identity, isLoading: identityLoading } = useIdentity(
    connectedAccount?.address
  )

  const handleDisconnect = () => {
    disconnect()
    navigate('/')
  }

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    if (connectedAccount?.address) {
      await navigator.clipboard.writeText(connectedAccount.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const profile = connectedAccount
    ? {
        ...mockUserProfile,
        address: connectedAccount.address,
        name: connectedAccount.name || identity?.display || mockUserProfile.name
      }
    : mockUserProfile

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {connectedAccount && config.useOnChainIdentity ? (
        <div className="mb-4">
          {/* Profile Picture */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Identicon
                value={profile.address}
                size={80}
                theme="polkadot"
                className="rounded-full"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-polkadot rounded-full flex items-center justify-center border-2 border-white">
                <User className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          {/* Account Info with Identity */}
          <div className="flex justify-center">
            {identityLoading ? (
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#1c1917] mb-1 font-serif">
                  {profile.name}
                </h2>
                <p className="text-xs text-[#78716c] font-mono mb-2">
                  {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                </p>
                <p className="text-xs text-[#a8a29e] italic">
                  Loading identity...
                </p>
              </div>
            ) : identity ? (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="text-center cursor-pointer">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <h2 className="text-xl font-bold text-[#1c1917] font-serif">
                        {identity.display || profile.name}
                      </h2>
                      {identity.verified && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-[#78716c] font-mono">
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
            ) : (
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#1c1917] mb-1 font-serif">
                  {profile.name}
                </h2>
                <p className="text-xs text-[#78716c] font-mono mb-2">
                  {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                </p>
                <p className="text-xs text-[#a8a29e] italic">
                  No on-chain identity
                </p>
              </div>
            )}
          </div>
        </div>
      ) : connectedAccount ? (
        <>
          {/* Profile Picture */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Identicon
                value={profile.address}
                size={80}
                theme="polkadot"
                className="rounded-full"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-polkadot rounded-full flex items-center justify-center border-2 border-white">
                <User className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold text-[#1c1917] text-center mb-1 font-serif">
            {profile.name}
          </h2>

          {/* Address */}
          <p className="text-xs text-[#78716c] text-center font-mono mb-2">
            {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
          </p>
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
            <p className="text-lg font-semibold text-gradient text-center">
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
              className="px-3 py-1 bg-gradient-to-br from-[#ff2867]/10 to-[#e6007a]/5 border border-[#ff2867]/20 text-[#ff2867] text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Logout Button */}
      {connectedAccount && (
        <div className="mt-4 pt-4 border-t border-[#e7e5e4]">
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-[#78716c] hover:text-[#1c1917] hover:bg-[#fafaf9] rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </button>
        </div>
      )}

      {/* On-chain Identity Badge (when available) */}
      {config.useOnChainIdentity && (
        <div className="mt-4 pt-4 border-t border-[#e7e5e4]">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-[#78716c]">Verified on People Chain</span>
          </div>
        </div>
      )}
    </div>
  )
}
