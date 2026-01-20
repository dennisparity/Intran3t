import { Shield, CheckCircle2, Users, FileText, Zap } from 'lucide-react'
import { Button } from '../ui/Button'

interface WelcomeStepProps {
  onNext: () => void
  onSkip: () => void
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(255,40,103,0.1)] mb-4">
          <Shield className="w-8 h-8 text-[#ff2867]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1c1917] mb-2 font-serif">
          Set Up Your Identity
        </h2>
        <p className="text-[#78716c]">
          Verify your identity on People Chain to unlock all Intran3t features
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#fafaf9] border border-[#e7e5e4]">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[#1c1917] text-sm">Governance Access</h3>
            <p className="text-xs text-[#78716c] mt-0.5">
              Participate in organization polls and decisions
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#fafaf9] border border-[#e7e5e4]">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[#1c1917] text-sm">Forms & Surveys</h3>
            <p className="text-xs text-[#78716c] mt-0.5">
              Create and submit forms to collect team feedback
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#fafaf9] border border-[#e7e5e4]">
          <Zap className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[#1c1917] text-sm">NFT Access Passes</h3>
            <p className="text-xs text-[#78716c] mt-0.5">
              Mint and manage NFT access passes (Acc3ss)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#fafaf9] border border-[#e7e5e4]">
          <Users className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[#1c1917] text-sm">Quick Navigation & Help</h3>
            <p className="text-xs text-[#78716c] mt-0.5">
              Access team resources and support
            </p>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>What is on-chain identity?</strong>
          <br />
          Your identity is stored on Polkadot People Chain and verified by registrars.
          This ensures authenticity and prevents impersonation.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          variant="default"
          size="lg"
          onClick={onNext}
          className="w-full"
        >
          Set Up Identity
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="w-full"
        >
          Skip for Now
        </Button>
      </div>

      {/* Note */}
      <p className="text-xs text-center text-[#a8a29e]">
        You can set up your identity later from your profile settings
      </p>
    </div>
  )
}
