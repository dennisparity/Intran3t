import { useWallet } from '../../providers/WalletProvider'
import { useBalance } from '../../hooks/useBalance'
import Identicon from '@polkadot/react-identicon'
import { User } from 'lucide-react'
import type { ProfileConfig } from './types'
import { mockUserProfile } from './config'
import { useEVM } from '../../providers/EVMProvider'

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
  profileAddress?: string
  profileEvmAddress?: string
  isOwnProfile?: boolean
}

function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

export function ProfileWidget({
  config,
  profileAddress,
  profileEvmAddress,
  isOwnProfile = true
}: ProfileWidgetProps) {
  const { selectedAccount, isReconnecting } = useWallet()
  const { account: evmAccount } = useEVM()

  const displayAddress = profileAddress || selectedAccount?.address || evmAccount
  const isEvm = displayAddress ? isEvmAddress(displayAddress) : false

  const { data: balance } = useBalance(
    (!isEvm && displayAddress) ? displayAddress : undefined
  )

  const accountName = selectedAccount?.name || 'Unknown User'
  const profile = displayAddress
    ? {
        address: displayAddress,
        name: accountName,
        description: undefined,
        tags: undefined,
        avatar: undefined
      }
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

            {balance?.free ? (
              <p className="text-lg font-semibold text-[#1c1917] text-center mt-1">
                {formatBalance(balance.free)} PAS
              </p>
            ) : (
              <p className="text-sm text-[#a8a29e] text-center mt-1">Syncing...</p>
            )}
          </div>
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

        {config.showDescription && profile.description && (
          <p className="text-sm text-[#57534e] text-center mb-4 leading-relaxed">
            {profile.description}
          </p>
        )}

        {config.showTags && profile.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {profile.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] text-xs font-medium rounded-full"
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
