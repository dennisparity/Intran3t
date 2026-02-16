import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface MapAccountModalProps {
  evmAddress: string
  onClose: () => void
  onSuccess: () => void
  onMap: () => Promise<void>
}

export function MapAccountModal({
  evmAddress,
  onClose,
  onSuccess,
  onMap
}: MapAccountModalProps) {
  const [step, setStep] = useState<'info' | 'signing' | 'success' | 'error'>('info')
  const [error, setError] = useState<string | null>(null)

  const handleMap = async () => {
    setStep('signing')
    setError(null)

    try {
      await onMap()
      setStep('success')
      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err) {
      console.error('Mapping failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStep('error')
    }
  }

  const handleRetry = () => {
    setStep('info')
    setError(null)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {step === 'info' && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-[#1c1917] mb-2">
                  Map Your Account
                </h3>
                <p className="text-sm text-[#57534e] mb-3">
                  To interact with smart contracts, you need to map your Substrate account to an EVM address. This allows your wallet to sign transactions.
                </p>
                <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-3 mb-3">
                  <p className="text-xs text-[#78716c] mb-1">Your EVM Address:</p>
                  <p className="font-mono text-sm text-[#1c1917] break-all">{evmAddress}</p>
                </div>
                <p className="text-xs text-[#78716c]">
                  This creates an on-chain mapping. A small deposit is required (refundable if you unmap later).
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMap}
                className="flex-1 bg-[#1c1917] hover:bg-[#292524]"
              >
                Map Account
              </Button>
            </div>
          </>
        )}

        {step === 'signing' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-[#1c1917] animate-spin mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-[#1c1917] mb-2">
              Signing Transaction
            </h3>
            <p className="text-sm text-[#78716c]">
              Please sign the transaction in your wallet...
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-[#1c1917] mb-2">
              Account Mapped!
            </h3>
            <p className="text-sm text-[#78716c]">
              You can now sign smart contract transactions with your Substrate wallet.
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-[#1c1917] mb-2">
              Mapping Failed
            </h3>
            <p className="text-sm text-[#78716c] mb-4">
              {error || 'An unknown error occurred'}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={handleRetry}
                className="flex-1 bg-[#1c1917] hover:bg-[#292524]"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
