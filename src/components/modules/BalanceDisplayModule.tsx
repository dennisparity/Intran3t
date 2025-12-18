import { useBalance, useTypink } from "typink";
import { Wallet, TrendingUp, Lock, Snowflake } from "lucide-react";

interface BalanceDisplayModuleProps {
  address: string;
}

function formatBalance(value: bigint | undefined, decimals: number = 10): string {
  if (!value) return "0";

  const divisor = BigInt(10 ** decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;

  // Format with 4 decimal places
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 4);

  return `${wholePart}.${fractionalStr}`;
}

export function BalanceDisplayModule({ address }: BalanceDisplayModuleProps) {
  const { connectedNetworks } = useTypink();

  // Get the first connected network with safety checks
  const network = connectedNetworks?.[0];

  // Use typink's built-in useBalance hook (works with light client)
  const balance = useBalance(address, {
    networkId: network?.id,
  });

  if (!network || !connectedNetworks || connectedNetworks.length === 0) {
    return (
      <div className="glass-dark border border-white/10 rounded-2xl p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-polkadot flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Balance</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-sm">Connecting to network...</p>
        </div>
      </div>
    );
  }

  const isLoading = !balance?.free;
  const freeBalance = formatBalance(balance?.free);
  const reservedBalance = formatBalance(balance?.reserved);
  const frozenBalance = formatBalance(balance?.frozen);
  const totalBalance = formatBalance(
    (balance?.free || BigInt(0)) + (balance?.reserved || BigInt(0))
  );

  return (
    <div className="glass-dark border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-polkadot flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Balance</h3>
          <p className="text-xs text-white/50">{network.name}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-sm">Loading balance...</p>
        </div>
      ) : (
        <>
          {/* Total Balance - Featured */}
          <div className="mb-4 pb-4 border-b border-white/10">
            <p className="text-xs text-white/60 mb-1">Total Balance</p>
            <p className="text-2xl font-bold text-gradient">{totalBalance} DOT</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white/70">Free</span>
              </div>
              <span className="text-sm font-semibold text-white">{freeBalance}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-white/70">Reserved</span>
              </div>
              <span className="text-sm font-semibold text-white">{reservedBalance}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/70">Frozen</span>
              </div>
              <span className="text-sm font-semibold text-white">{frozenBalance}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
