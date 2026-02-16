import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { queryRegistrars, type RegistrarInfo } from '../../modules/profile/identity-transaction-helpers'
import { searchRegistryByAddress } from '../../services/dotid-registry'

interface RegistrarWithIdentity extends RegistrarInfo {
  displayName?: string
  verifiedIdentity?: boolean
}

interface RegistrarSelectionStepProps {
  onNext: (registrar: RegistrarInfo) => void
  onBack: () => void
  selectedRegistrar?: RegistrarInfo
}

export function RegistrarSelectionStep({ onNext, onBack, selectedRegistrar }: RegistrarSelectionStepProps) {
  const [registrars, setRegistrars] = useState<RegistrarWithIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(selectedRegistrar?.index ?? null)

  useEffect(() => {
    loadRegistrars()
  }, [])

  const loadRegistrars = async () => {
    try {
      setLoading(true)
      setError(null)

      // Query registrars from People Chain
      const registrarList = await queryRegistrars()

      // Enrich with identity data from dotid.app
      const enrichedRegistrars = await Promise.all(
        registrarList.map(async (reg) => {
          try {
            const identity = await searchRegistryByAddress(reg.account)
            return {
              ...reg,
              displayName: identity?.display || undefined,
              verifiedIdentity: identity ? true : false
            }
          } catch {
            return reg
          }
        })
      )

      setRegistrars(enrichedRegistrars)
    } catch (err) {
      console.error('Failed to load registrars:', err)
      setError(err instanceof Error ? err.message : 'Failed to load registrars')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (registrar: RegistrarWithIdentity) => {
    setSelected(registrar.index)
  }

  const handleContinue = () => {
    const registrar = registrars.find(r => r.index === selected)
    if (registrar) {
      onNext(registrar)
    }
  }

  const formatFee = (fee: bigint) => {
    const dots = Number(fee) / 1e10
    return `${dots.toFixed(2)} DOT`
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-[#1c1917] dark:text-[#fafaf9] animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1c1917] dark:text-[#fafaf9] mb-2">
          Loading Registrars...
        </h2>
        <p className="text-sm text-[#78716c] dark:text-[#a8a29e]">
          Fetching available identity registrars from People Chain
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-[#1c1917] dark:text-[#fafaf9] mb-2">
          Failed to Load Registrars
        </h2>
        <p className="text-sm text-[#78716c] dark:text-[#a8a29e] mb-6">
          {error}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onBack}>
            Go Back
          </Button>
          <Button variant="default" onClick={loadRegistrars}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold text-[#1c1917] dark:text-[#fafaf9] font-serif">
          Select a Registrar
        </h2>
        <p className="text-sm text-[#78716c] dark:text-[#a8a29e] mt-1">
          Choose a registrar to verify your identity on People Chain
        </p>
      </div>

      {/* Info banner */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900 dark:text-blue-200">
          <strong>What is a registrar?</strong> Registrars verify identities on People Chain.
          After setting your identity, you'll request judgement from your selected registrar.
          Each registrar has different fees and verification requirements.
        </div>
      </div>

      {/* Registrar list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {registrars.length === 0 ? (
          <p className="text-center text-[#78716c] dark:text-[#a8a29e] py-8">
            No registrars available
          </p>
        ) : (
          registrars.map((registrar) => (
            <button
              key={registrar.index}
              onClick={() => handleSelect(registrar)}
              className={`
                w-full p-4 rounded-xl border text-left transition-all
                ${selected === registrar.index
                  ? 'border-[#1c1917] dark:border-[#fafaf9] bg-[#fafaf9] dark:bg-[#292524]'
                  : 'border-[#e7e5e4] dark:border-[#44403c] bg-white dark:bg-[#1c1917] hover:border-[#1c1917]/30 dark:hover:border-[#fafaf9]/30'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#1c1917] dark:text-[#fafaf9]">
                      {registrar.displayName || `Registrar #${registrar.index}`}
                    </span>
                    {registrar.verifiedIdentity && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-[#78716c] dark:text-[#a8a29e] font-mono mb-2">
                    {truncateAddress(registrar.account)}
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#78716c] dark:text-[#a8a29e]">
                      Fee: <strong className="text-[#1c1917] dark:text-[#fafaf9]">{formatFee(registrar.fee)}</strong>
                    </span>
                  </div>
                </div>

                {selected === registrar.index && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-[#1c1917] dark:bg-[#fafaf9] flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white dark:text-[#1c1917]" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#e7e5e4] dark:border-[#44403c]">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={handleContinue}
          disabled={selected === null}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
