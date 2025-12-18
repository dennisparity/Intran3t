import { useBalance } from '../../hooks/useBalance'
import { formatBalance } from '@polkadot/util'
import { Wallet, TrendingUp, Lock, Snowflake } from 'lucide-react'

interface BalanceModuleProps {
  address: string
}

export function BalanceModule({ address }: BalanceModuleProps) {
  const { data: balance, isLoading, error } = useBalance(address)

  if (isLoading) {
    return (
      <div className="glass-dark border border-white/10 rounded-2xl p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-white">Balance</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-white/5 rounded"></div>
          <div className="h-6 bg-white/5 rounded w-3/4"></div>
          <div className="h-6 bg-white/5 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-dark border border-white/10 rounded-2xl p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-white">Balance</h3>
        </div>
        <p className="text-white/40 text-sm">Unable to load balance</p>
      </div>
    )
  }

  const freeBalance = balance?.free ? formatBalance(balance.free, { withSi: true }) : '0'
  const reservedBalance = balance?.reserved ? formatBalance(balance.reserved, { withSi: true }) : '0'
  const frozenBalance = balance?.frozen ? formatBalance(balance.frozen, { withSi: true }) : '0'
  const totalBalance = balance?.total ? formatBalance(balance.total, { withSi: true }) : '0'

  return (
    <div className="glass-dark border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-polkadot flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Balance</h3>
      </div>

      {/* Total Balance - Featured */}
      <div className="mb-6 pb-6 border-b border-white/10">
        <p className="text-sm text-white/60 mb-2">Total Balance</p>
        <p className="text-3xl font-bold text-gradient">{totalBalance}</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white/70">Free</span>
          </div>
          <span className="font-semibold text-white">{freeBalance}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-white/70">Reserved</span>
          </div>
          <span className="font-semibold text-white">{reservedBalance}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-white/70">Frozen</span>
          </div>
          <span className="font-semibold text-white">{frozenBalance}</span>
        </div>
      </div>
    </div>
  )
}
