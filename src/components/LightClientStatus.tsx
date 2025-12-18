/**
 * Light Client Status Component
 *
 * Displays the current sync status of the light client connection.
 * Shows connecting state, syncing progress, and connection quality.
 *
 * @module components/LightClientStatus
 */

import { usePolkadot } from "@/providers/PolkadotProvider";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Loader2, Check } from "lucide-react";

export function LightClientStatus() {
  const { status } = usePolkadot();

  const statusConfig = {
    "not-connected": {
      icon: WifiOff,
      text: "Not Connected",
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      description: "Light client not initialized",
    },
    connecting: {
      icon: Loader2,
      text: "Syncing",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      description: "Light client syncing with network",
      animate: true,
    },
    connected: {
      icon: Check,
      text: "Connected",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Light client fully synced",
    },
    error: {
      icon: WifiOff,
      text: "Error",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      description: "Failed to connect to network",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
    >
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${config.color}`}
      >
        <Icon
          className={`w-4 h-4 ${config.animate ? "animate-spin" : ""}`}
        />
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    </motion.div>
  );
}

/**
 * Detailed Light Client Status with expanded information
 */
export function LightClientStatusDetailed() {
  const { status } = usePolkadot();

  const statusConfig = {
    "not-connected": {
      icon: WifiOff,
      text: "Not Connected",
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/20",
      description: "Light client not initialized. Waiting to connect...",
      tips: "The light client will sync directly from the blockchain network.",
    },
    connecting: {
      icon: Loader2,
      text: "Syncing with Network",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      description: "Light client is syncing with the blockchain network...",
      tips: "This may take a few moments on first connection. The light client validates blocks independently.",
      animate: true,
    },
    connected: {
      icon: Check,
      text: "Fully Synced",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      description: "Light client is fully synced and ready to use.",
      tips: "You're connected directly to the blockchain via a trustless light client.",
    },
    error: {
      icon: WifiOff,
      text: "Connection Error",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      description: "Failed to connect to the network.",
      tips: "Please check your internet connection and try refreshing the page.",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-dark rounded-xl p-4 border ${config.borderColor}`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.bgColor} p-2 rounded-lg`}>
          <Icon
            className={`w-5 h-5 ${config.color} ${config.animate ? "animate-spin" : ""}`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold ${config.color}`}>
              {config.text}
            </h3>
            {status === "connecting" && (
              <div className="flex gap-1">
                <motion.div
                  className="w-1.5 h-1.5 bg-yellow-500 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-yellow-500 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-yellow-500 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                />
              </div>
            )}
          </div>
          <p className="text-sm text-white/60 mb-2">{config.description}</p>
          <p className="text-xs text-white/40">{config.tips}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default LightClientStatus;
