import { useWallet } from '../../providers/WalletProvider'
import Identicon from '@polkadot/react-identicon'
import { User, ShieldCheck, ShieldOff, Github, Mail, Twitter, Lock } from 'lucide-react'
import type { ProfileConfig } from './types'
import { mockUserProfile } from './config'
import { useEVM } from '../../providers/EVMProvider'

interface ProfileWidgetProps {
  config: ProfileConfig
  profileAddress?: string
  profileEvmAddress?: string
  isOwnProfile?: boolean
}

function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

function PopBadge({ level }: { level: 'full' | 'light' | null | undefined }) {
  if (level === 'full') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        <ShieldCheck className="w-3 h-3" />
        PoPFull
      </span>
    )
  }
  if (level === 'light') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
        <ShieldCheck className="w-3 h-3" />
        Light
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#f5f5f4] text-[#78716c] border border-[#e7e5e4]">
      <ShieldOff className="w-3 h-3" />
      No PoP
    </span>
  )
}

const ATTESTATION_PLACEHOLDERS = [
  { icon: Github, label: 'GitHub' },
  { icon: Mail, label: 'Email' },
  { icon: Twitter, label: 'Twitter / X' },
]

export function ProfileWidget({
  config,
  profileAddress,
  profileEvmAddress,
  isOwnProfile = true
}: ProfileWidgetProps) {
  const { selectedAccount, isReconnecting, inHost } = useWallet()
  const { account: evmAccount } = useEVM()

  const displayAddress = profileAddress || selectedAccount?.address || evmAccount
  const isEvm = displayAddress ? isEvmAddress(displayAddress) : false

  const accountName = selectedAccount?.name || 'Unknown User'
  const profile = displayAddress
    ? { address: displayAddress, name: accountName }
    : mockUserProfile

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {!isOwnProfile && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-200 text-purple-700 text-xs font-medium rounded-t-2xl">
          Viewing Profile
        </div>
      )}

      <div className="p-6">
        {isReconnecting && !selectedAccount ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 bg-[#f5f5f4] rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-[#f5f5f4] rounded animate-pulse" />
            <div className="h-3 w-24 bg-[#f5f5f4] rounded animate-pulse" />
          </div>
        ) : selectedAccount ? (
          <>
            {/* Avatar + name + address */}
            <div className="flex flex-col items-center mb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative flex-shrink-0">
                  <Identicon
                    value={profile.address}
                    size={56}
                    theme="polkadot"
                    className="rounded-full"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1c1917] rounded-full flex items-center justify-center border-2 border-white">
                    <User className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
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

            {/* Personhood status */}
            <div className="border-t border-[#e7e5e4] pt-3 mb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#78716c] uppercase tracking-wide">Personhood</p>
                {inHost && selectedAccount ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    <ShieldCheck className="w-3 h-3" />
                    Member
                  </span>
                ) : (
                  <PopBadge level={null} />
                )}
              </div>
            </div>

            {/* Attestations (placeholder) */}
            <div className="border-t border-[#e7e5e4] pt-3">
              <p className="text-xs font-medium text-[#78716c] uppercase tracking-wide mb-2">Attestations</p>
              <div className="space-y-1.5">
                {ATTESTATION_PLACEHOLDERS.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-3 py-2 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-[#a8a29e]" />
                      <span className="text-xs text-[#78716c]">{label}</span>
                    </div>
                    <Lock className="w-3 h-3 text-[#d6d3d1]" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#a8a29e] text-center mt-2">Reputation attestations — coming soon</p>
            </div>
          </>
        ) : evmAccount ? (
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 bg-[#f5f5f4] rounded-full flex items-center justify-center">
                  <User className="w-7 h-7 text-[#78716c]" />
                </div>
              </div>
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
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-[#fafaf9] rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-[#78716c]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-[#1c1917] text-center mb-1 font-serif">
              {profile.name}
            </h2>
          </>
        )}
      </div>
    </div>
  )
}
