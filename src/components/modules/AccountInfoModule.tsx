import { AccountInfo } from "@/components/account-info.dedot";
import { useTypink } from "typink";
import { User } from "lucide-react";

interface AccountInfoModuleProps {
  address: string;
}

export function AccountInfoModule({ address }: AccountInfoModuleProps) {
  const { supportedNetworks } = useTypink();

  // Find polkadot people chain with safety checks
  const peopleChain = supportedNetworks?.find(
    (n) => n.id === "polkadot-people" || n.name?.toLowerCase().includes("people")
  );

  if (!peopleChain || !supportedNetworks || supportedNetworks.length === 0) {
    return (
      <div className="glass-dark border border-white/10 rounded-2xl p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-polkadot flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Account Info</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-sm">People chain not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-dark border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-polkadot flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Account Info</h3>
      </div>

      <div className="flex-1">
        <AccountInfo
          chainId={peopleChain.id}
          address={address}
          fields={["twitter", "github", "email", "discord"]}
        />
      </div>
    </div>
  );
}
