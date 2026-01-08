import { Lock, CheckCircle2, ExternalLink } from 'lucide-react'

interface LockedModuleProps {
  moduleName: string
  description?: string
}

export function LockedModule({ moduleName, description }: LockedModuleProps) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        {/* Lock Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#fafaf9] border-2 border-[#e7e5e4] mb-4">
          <Lock className="w-8 h-8 text-[#a8a29e]" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-[#1c1917] mb-2 font-serif">
          {moduleName} Locked
        </h3>

        {/* Description */}
        <p className="text-sm text-[#78716c] mb-6 leading-relaxed">
          {description || `You need a verified on-chain identity to access ${moduleName}.`}
        </p>

        {/* Requirements */}
        <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-4 mb-6">
          <h4 className="text-xs font-semibold text-[#1c1917] uppercase tracking-wide mb-3">
            Requirements
          </h4>
          <div className="space-y-2 text-left">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#57534e]">
                Set up your on-chain identity on Polkadot People Chain
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#57534e]">
                Get your identity verified by a registrar
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#57534e]">
                Return here to access all platform features
              </p>
            </div>
          </div>
        </div>

        {/* Learn More Link */}
        <a
          href="https://wiki.polkadot.network/docs/learn-identity"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
        >
          <span>Learn how to set up your identity</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
