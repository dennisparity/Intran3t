import { CHAINS, ChainConfig } from "@/config/chains";
import { cn } from "@/lib/utils";
import { usePolkadotContext } from "@/providers/PolkadotProvider";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Wifi } from "lucide-react";
import { useState } from "react";

/**
 * Network Switcher Component
 *
 * Allows users to switch between different Polkadot networks.
 * Persists selection in localStorage and automatically reconnects the API.
 *
 * @example
 * ```tsx
 * <NetworkSwitcher />
 * ```
 */
export function NetworkSwitcher() {
  const { currentEndpoint, switchNetwork, status } = usePolkadotContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Find current network from endpoint
  const currentNetwork = Object.values(CHAINS).find(
    (chain) => chain.endpoint === currentEndpoint
  );

  const handleNetworkSwitch = async (chain: ChainConfig) => {
    if (chain.endpoint === currentEndpoint || isSwitching) return;

    setIsSwitching(true);
    setIsOpen(false);

    try {
      // Persist selection
      localStorage.setItem("selected_network", chain.name);

      // Switch network
      await switchNetwork(chain.endpoint);

      // Reload page to reinitialize with new network
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch network:", error);
      setIsSwitching(false);
    }
  };

  const getNetworkCategories = () => {
    const mainnets = Object.values(CHAINS).filter((c) => !c.testnet);
    const testnets = Object.values(CHAINS).filter((c) => c.testnet);
    return { mainnets, testnets };
  };

  const { mainnets, testnets } = getNetworkCategories();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          "bg-white/5 hover:bg-white/10 border border-white/10",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: currentNetwork?.color || "#E6007A" }}
        />
        <span className="text-sm font-medium text-white">
          {isSwitching ? "Switching..." : currentNetwork?.name || "Unknown"}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/60 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute right-0 mt-2 w-64 z-50",
                "bg-[#1a0b2e]/95 backdrop-blur-xl rounded-xl border border-white/20",
                "shadow-2xl overflow-hidden"
              )}
            >
              {/* Mainnets */}
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Mainnets
                </div>
                {mainnets.map((chain) => (
                  <NetworkItem
                    key={chain.name}
                    chain={chain}
                    isActive={chain.endpoint === currentEndpoint}
                    onClick={() => handleNetworkSwitch(chain)}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10" />

              {/* Testnets */}
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Testnets
                </div>
                {testnets.map((chain) => (
                  <NetworkItem
                    key={chain.name}
                    chain={chain}
                    isActive={chain.endpoint === currentEndpoint}
                    onClick={() => handleNetworkSwitch(chain)}
                  />
                ))}
              </div>

              {/* Footer with Status */}
              <div className="px-4 py-3 bg-black/40 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Wifi className="w-3 h-3" />
                    <span>Light client</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {status === "connecting" && (
                      <>
                        <motion.div
                          className="w-1.5 h-1.5 bg-yellow-400 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-xs text-yellow-400">Syncing...</span>
                      </>
                    )}
                    {status === "connected" && (
                      <>
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        <span className="text-xs text-green-400">Connected</span>
                      </>
                    )}
                    {status === "error" && (
                      <>
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                        <span className="text-xs text-red-400">Error</span>
                      </>
                    )}
                    {status === "not-connected" && (
                      <>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        <span className="text-xs text-gray-400">Idle</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NetworkItemProps {
  chain: ChainConfig;
  isActive: boolean;
  onClick: () => void;
}

function NetworkItem({ chain, isActive, onClick }: NetworkItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
        "transition-all duration-150",
        isActive
          ? "bg-white/10 text-white"
          : "hover:bg-white/5 text-white/80 hover:text-white"
      )}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: chain.color }}
      />
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{chain.displayName}</div>
        <div className="text-xs text-white/40">{chain.tokenSymbol}</div>
      </div>
      {isActive && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
    </button>
  );
}

export default NetworkSwitcher;
