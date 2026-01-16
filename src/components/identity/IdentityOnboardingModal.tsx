import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog'
import { WelcomeStep } from './WelcomeStep'
import { IdentityFormStep } from './IdentityFormStep'
import { RegistrarSelectionStep } from './RegistrarSelectionStep'
import type { IdentityFormData, RegistrarInfo } from '../../modules/profile/identity-transaction-helpers'
import { buildIdentityInfo, submitSetIdentity, submitRequestJudgement, calculateDeposits } from '../../modules/profile/identity-transaction-helpers'
import { getPeopleChainApi } from '../../modules/profile/identity-helpers'
import { useTypink } from 'typink'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/Button'

type ModalStep = 'welcome' | 'form' | 'registrar' | 'submitting' | 'success' | 'error'

interface IdentityOnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDismiss: () => void
}

export function IdentityOnboardingModal({
  open,
  onOpenChange,
  onDismiss
}: IdentityOnboardingModalProps) {
  const { connectedAccount } = useTypink()
  const [step, setStep] = useState<ModalStep>('welcome')
  const [formData, setFormData] = useState<IdentityFormData | null>(null)
  const [selectedRegistrar, setSelectedRegistrar] = useState<RegistrarInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleWelcomeNext = () => {
    setStep('form')
  }

  const handleWelcomeSkip = () => {
    onDismiss()
    onOpenChange(false)
  }

  const handleFormBack = () => {
    setStep('welcome')
    setError(null)
  }

  const handleFormNext = (data: IdentityFormData) => {
    setFormData(data)
    setStep('registrar')
    setError(null)
  }

  const handleRegistrarBack = () => {
    setStep('form')
    setError(null)
  }

  const handleRegistrarNext = async (registrar: RegistrarInfo) => {
    if (!connectedAccount || !formData) {
      setError('Missing wallet connection or form data')
      setStep('error')
      return
    }

    setSelectedRegistrar(registrar)
    setStep('submitting')
    setError(null)

    try {
      // Connect to People Chain
      const peopleApi = await getPeopleChainApi()

      // Step 1: Calculate required deposits
      console.log('💰 Calculating deposits...')
      const numFields = Object.values(formData).filter(v => v && v.trim() !== '').length
      const deposits = await calculateDeposits(peopleApi, numFields, registrar.fee)

      console.log(`Required deposits: ${deposits.total} (${Number(deposits.total) / 1e10} DOT)`)

      // Step 2: Check account balance
      console.log('💰 Checking account balance...')
      const accountInfo = await peopleApi.query.system.account(connectedAccount.address)
      const freeBalance = accountInfo.data.free.toBigInt()

      console.log(`Free balance: ${freeBalance} (${Number(freeBalance) / 1e10} DOT)`)

      // Check if sufficient balance
      if (freeBalance < deposits.total) {
        const requiredDOT = (Number(deposits.total) / 1e10).toFixed(2)
        const availableDOT = (Number(freeBalance) / 1e10).toFixed(2)
        const neededDOT = ((Number(deposits.total) - Number(freeBalance)) / 1e10).toFixed(2)

        throw new Error(
          `Insufficient balance on People Chain. You need at least ${requiredDOT} DOT but only have ${availableDOT} DOT available. You need ${neededDOT} more DOT.\n\n` +
          `Breakdown:\n` +
          `• Basic deposit: ${(Number(deposits.basic) / 1e10).toFixed(2)} DOT\n` +
          `• Field deposits: ${(Number(deposits.field * BigInt(numFields)) / 1e10).toFixed(2)} DOT (${numFields} fields)\n` +
          `• Registrar fee: ${(Number(deposits.registrar) / 1e10).toFixed(2)} DOT`
        )
      }

      console.log('✅ Sufficient balance confirmed')

      // Step 3: Build identity info from form data
      const identityInfo = buildIdentityInfo(formData)
      console.log('Built identity info:', identityInfo)

      // Step 4: Submit setIdentity transaction
      console.log('📝 Submitting setIdentity transaction...')
      const identityResult = await submitSetIdentity(connectedAccount, identityInfo, peopleApi)

      if (!identityResult.success) {
        throw new Error(identityResult.error || 'Failed to set identity')
      }

      console.log('✅ Identity set successfully:', identityResult.hash)

      // Step 5: Submit requestJudgement transaction
      console.log('📝 Submitting requestJudgement transaction...')
      const judgementResult = await submitRequestJudgement(
        connectedAccount,
        registrar.index,
        registrar.fee,
        peopleApi
      )

      if (!judgementResult.success) {
        throw new Error(judgementResult.error || 'Failed to request judgement')
      }

      console.log('✅ Judgement requested successfully:', judgementResult.hash)
      setStep('success')

      // Auto-close after 5 seconds
      setTimeout(() => {
        onOpenChange(false)
        // Reset state
        setStep('welcome')
        setFormData(null)
        setSelectedRegistrar(null)
        setError(null)
      }, 5000)
    } catch (err) {
      console.error('❌ Identity submission error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStep('error')
    }
  }

  const handleRetry = () => {
    if (formData && selectedRegistrar) {
      handleRegistrarNext(selectedRegistrar)
    } else if (formData) {
      setStep('registrar')
      setError(null)
    } else {
      setStep('form')
      setError(null)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <WelcomeStep
            onNext={handleWelcomeNext}
            onSkip={handleWelcomeSkip}
          />
        )

      case 'form':
        return (
          <IdentityFormStep
            onNext={handleFormNext}
            onBack={handleFormBack}
            initialData={formData || undefined}
          />
        )

      case 'registrar':
        return (
          <RegistrarSelectionStep
            onNext={handleRegistrarNext}
            onBack={handleRegistrarBack}
            selectedRegistrar={selectedRegistrar || undefined}
          />
        )

      case 'submitting':
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4 animate-pulse">
              <div className="w-8 h-8 border-4 border-[#1c1917] border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1917] mb-2">
              Submitting Transactions...
            </h2>
            <p className="text-sm text-[#78716c] mb-2">
              Please sign both transactions in your wallet
            </p>
            <p className="text-xs text-[#a8a29e]">
              1. Set Identity<br />
              2. Request Registrar Verification
            </p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1917] mb-2">
              Identity Verification Requested!
            </h2>
            <p className="text-sm text-[#78716c] mb-4">
              Your identity has been set and verification requested from {selectedRegistrar?.index !== undefined ? `Registrar #${selectedRegistrar.index}` : 'the registrar'}
            </p>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <p className="text-xs text-blue-900">
                <strong>What happens next?</strong><br />
                The registrar will review your identity information. Once approved, all Intran3t modules will unlock automatically.
              </p>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1917] mb-2">
              Submission Failed
            </h2>
            <div className="text-sm text-[#78716c] mb-6 max-w-md mx-auto">
              {error ? (
                <pre className="whitespace-pre-wrap text-left font-sans">
                  {error}
                </pre>
              ) : (
                'An error occurred while submitting your identity'
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('form')
                  setError(null)
                }}
              >
                Go Back
              </Button>
              <Button
                variant="default"
                onClick={handleRetry}
              >
                Try Again
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Hide default header for custom step rendering */}
        {step === 'submitting' && (
          <DialogHeader className="sr-only">
            <DialogTitle>Submitting Identity</DialogTitle>
            <DialogDescription>Processing your identity submission</DialogDescription>
          </DialogHeader>
        )}

        {renderStep()}
      </DialogContent>
    </Dialog>
  )
}
