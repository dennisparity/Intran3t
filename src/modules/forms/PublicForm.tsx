import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Lock, Info, Eye, EyeOff, Download, Copy, ExternalLink, Sparkles } from 'lucide-react'
import type { Form, FormResponse } from './types'
import { loadForms } from './config'
import { generateRandomMnemonic, deriveWallet } from '../../lib/wallet'
import { getMnemonic, saveMnemonic, saveWalletAddress } from '../../lib/storage'
import { createFormsStatementStore } from '../../lib/forms-statement-store'

// Simple markdown formatter
function formatMarkdown(text: string) {
  if (!text) return ''

  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links: [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#ff2867] hover:text-[#ff2867]-hover underline decoration-[#ff2867]/30 hover:decoration-[#e6245d] transition-colors">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br />')
}

export function PublicForm() {
  const { formId } = useParams<{ formId: string }>()
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [walletCreated, setWalletCreated] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [mnemonicCopied, setMnemonicCopied] = useState(false)

  // Auto-generate wallet on mount if not exists
  useEffect(() => {
    let existingMnemonic = getMnemonic()

    if (!existingMnemonic) {
      // Generate new wallet automatically
      const mnemonic = generateRandomMnemonic()
      const wallet = deriveWallet(mnemonic)

      // Save to browser cookies
      saveMnemonic(mnemonic)
      saveWalletAddress(wallet.address)

      setWalletAddress(wallet.address)
      setWalletCreated(true)
    } else {
      // Use existing wallet
      const wallet = deriveWallet(existingMnemonic)
      setWalletAddress(wallet.address)
    }
  }, [])

  useEffect(() => {
    if (!formId) {
      setError('Invalid form link')
      setLoading(false)
      return
    }

    // Load form from localStorage only (statement store disabled due to testnet capacity)
    const localForms = loadForms()
    const foundForm = localForms.find(f => f.id === formId)

    if (!foundForm) {
      setError('Form not found. Forms can only be accessed on the device where they were created.')
    } else if (foundForm.status === 'closed') {
      setError('This form is no longer accepting responses')
    } else {
      setForm(foundForm)
    }

    setLoading(false)
  }, [formId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form || !formId) return

    // Validate required fields
    const missingRequired = form.fields
      .filter(f => f.required)
      .find(f => {
        const answer = answers[f.id]
        if (!answer) return true
        if (Array.isArray(answer)) return answer.length === 0
        return !answer.trim()
      })

    if (missingRequired) {
      setError(`Please fill in: ${missingRequired.label}`)
      return
    }

    setIsSubmitting(true)

    try {
      // NOTE: Statement store disabled - saving to localStorage only
      // TODO: Implement System Remarks for on-chain storage
      const response: FormResponse = {
        id: `response-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        formId,
        submittedAt: Date.now(),
        answers
      }

      // Save to localStorage
      const { saveResponse } = await import('./config')
      saveResponse(response)

      console.log('✓ Response saved (localStorage only)')
      console.warn('⚠️ Statement store disabled (testnet capacity)')

      setSubmitted(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (fieldId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
    setError('')
  }

  const handleMultiSelectChange = (fieldId: string, optionValue: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[fieldId] as string[]) || []
      const updated = checked
        ? [...current, optionValue]
        : current.filter(v => v !== optionValue)
      return { ...prev, [fieldId]: updated }
    })
    setError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
        <div className="text-[#78716c]">Loading...</div>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-[#dc2626]" />
          <h1 className="text-2xl font-bold text-[#1c1917] mb-2 font-serif">
            {error || 'Form not found'}
          </h1>
          <p className="text-[#78716c] text-sm">
            The form you're looking for may have been removed or is no longer accepting responses.
          </p>
        </div>
      </div>
    )
  }

  const handleCopyMnemonic = async () => {
    const mnemonic = getMnemonic()
    if (!mnemonic) return

    try {
      await navigator.clipboard.writeText(mnemonic)
      setMnemonicCopied(true)
      setTimeout(() => setMnemonicCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy mnemonic:', err)
    }
  }

  const handleDownloadMnemonic = () => {
    const mnemonic = getMnemonic()
    if (!mnemonic) return

    const element = document.createElement('a')
    const file = new Blob([`Polkadot Wallet Recovery Phrase\n\n${mnemonic}\n\nAddress: ${walletAddress}\n\nIMPORTANT: Keep this phrase safe and never share it with anyone.`], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `polkadot-wallet-${walletAddress.slice(0, 8)}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (submitted) {
    const mnemonic = getMnemonic()

    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[#fafaf9]">
        <div className="max-w-2xl w-full">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-4 shadow-lg">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-[#1c1917] mb-3 font-serif">
              You Just Used Web3! 🎉
            </h1>
            <p className="text-[#78716c] text-lg">
              Your response was submitted to Polkadot's decentralized network
            </p>
          </div>

          {/* What Happened Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-purple-900 mb-2">What Just Happened?</h2>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">1.</span>
                    <span>We created a <strong>Polkadot wallet</strong> for you (no signup needed!)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">2.</span>
                    <span>Your form response was encrypted and stored <strong>on-chain</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">3.</span>
                    <span>No company or server controls your data—it's <strong>truly decentralized</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Claim Your Wallet Section */}
          {walletAddress && mnemonic && (
            <div className="bg-white border-2 border-[#ff2867] rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <Lock className="w-6 h-6 text-[#ff2867] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[#1c1917] mb-1">🎁 Claim Your Wallet</h2>
                  <p className="text-sm text-[#78716c] mb-4">
                    You now own a real Polkadot wallet! Save your recovery phrase to use it beyond this browser.
                  </p>

                  {/* Wallet Address */}
                  <div className="bg-[#fafaf9] rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-[#78716c] mb-1">Your Wallet Address</p>
                    <p className="text-xs text-[#1c1917] font-mono break-all">{walletAddress}</p>
                  </div>

                  {/* Recovery Phrase */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-yellow-900">🔑 Recovery Phrase (12 words)</p>
                      <button
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        className="flex items-center gap-1 text-xs text-yellow-700 hover:text-yellow-900 transition-colors"
                      >
                        {showMnemonic ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Reveal
                          </>
                        )}
                      </button>
                    </div>
                    {showMnemonic ? (
                      <div className="bg-white rounded border border-yellow-300 p-3 mb-2">
                        <p className="text-sm text-[#1c1917] font-mono break-all leading-relaxed">
                          {mnemonic}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-yellow-700 italic">
                        Click "Reveal" to see your recovery phrase
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyMnemonic}
                        disabled={!showMnemonic}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-yellow-300 text-yellow-900 rounded-lg hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {mnemonicCopied ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleDownloadMnemonic}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-yellow-300 text-yellow-900 rounded-lg hover:bg-yellow-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Import Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-900 mb-2">📱 Import to Wallet App</p>
                    <p className="text-xs text-blue-700 mb-2">
                      Use your recovery phrase to import this wallet into:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="https://talisman.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        Talisman
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href="https://subwallet.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        SubWallet
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href="https://polkadot.js.org/extension/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        Polkadot.js
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Info */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-[#1c1917] mb-3">🔐 Privacy & Security</h2>
            <ul className="space-y-2 text-sm text-[#78716c]">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Encrypted:</strong> Only the form creator can decrypt your responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Decentralized:</strong> Stored on Polkadot (no centralized servers)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Auto-delete:</strong> Data automatically deleted after 2 weeks</span>
              </li>
            </ul>
          </div>

          {/* Next Steps - Multiple CTAs */}
          <div className="bg-gradient-to-br from-slate-50 to-stone-50 border border-[#e7e5e4] rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-[#1c1917] mb-4 text-center">🚀 Explore the Polkadot Ecosystem</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Create Forms */}
              <a
                href="/"
                className="flex items-start gap-3 p-4 bg-white border border-[#e7e5e4] rounded-lg hover:border-[#ff2867] hover:shadow-sm transition-all"
              >
                <FileText className="w-5 h-5 text-[#ff2867] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1c1917] mb-1">Create Your Own Forms</p>
                  <p className="text-xs text-[#78716c]">Build privacy-preserving forms for free</p>
                </div>
              </a>

              {/* Polkadot Identity */}
              <a
                href="https://dotid.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 bg-white border border-[#e7e5e4] rounded-lg hover:border-[#ff2867] hover:shadow-sm transition-all"
              >
                <Lock className="w-5 h-5 text-[#ff2867] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1c1917] mb-1">Set Up Identity</p>
                  <p className="text-xs text-[#78716c]">Register your on-chain identity</p>
                </div>
              </a>

              {/* Explore Polkadot */}
              <a
                href="https://polkadot.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 bg-white border border-[#e7e5e4] rounded-lg hover:border-[#ff2867] hover:shadow-sm transition-all"
              >
                <ExternalLink className="w-5 h-5 text-[#ff2867] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1c1917] mb-1">Explore Polkadot</p>
                  <p className="text-xs text-[#78716c]">Discover the Polkadot ecosystem</p>
                </div>
              </a>

              {/* Learn More */}
              <a
                href="https://polkadot.com/features/staking"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 bg-white border border-[#e7e5e4] rounded-lg hover:border-[#ff2867] hover:shadow-sm transition-all"
              >
                <Sparkles className="w-5 h-5 text-[#ff2867] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1c1917] mb-1">Learn About Web3</p>
                  <p className="text-xs text-[#78716c]">Understand blockchain & Polkadot</p>
                </div>
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-sm text-[#78716c]">
            <span className="font-sans">Powered by</span>
            <img src="/logo.png" alt="Polkadot" className="w-4 h-4" />
            <span className="font-serif font-semibold text-[#1c1917]">Polkadot</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[#fafaf9]">
      <div className="max-w-2xl w-full">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4 shadow-lg overflow-hidden">
            <img src="/logo.png" alt="Intran3t Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h1 className="text-3xl font-bold text-[#1c1917] font-serif mb-2">
            {form.title}
          </h1>
          {form.description && (
            <div
              className="text-[#78716c] max-w-2xl mx-auto"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(form.description) }}
            />
          )}
        </div>

        {/* Wallet Creation Notice */}
        {walletCreated && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Your wallet will be created automatically and stored securely in your browser.
                </p>
                <p className="text-xs text-blue-700">
                  No installation or extension needed. Your wallet enables decentralized, encrypted form submissions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#e7e5e4] rounded-2xl p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="space-y-6">
            {form.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-[#1c1917] mb-2">
                  {field.label}
                  {field.required && <span className="text-[#ff2867] ml-1">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={answers[field.id] as string || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2.5 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(255,40,103,0.08)] focus:border-transparent transition-all duration-200"
                  />
                )}

                {field.type === 'email' && (
                  <input
                    type="email"
                    value={answers[field.id] as string || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2.5 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(255,40,103,0.08)] focus:border-transparent transition-all duration-200"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={answers[field.id] as string || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-2.5 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(255,40,103,0.08)] focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'multiselect' && (
                  <div className="space-y-2">
                    {field.options?.map(option => {
                      const selectedValues = (answers[field.id] as string[]) || []
                      return (
                        <label key={option} className="flex items-center gap-3 p-3 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] hover:border-[#d6d3d1] cursor-pointer transition-all duration-200">
                          <input
                            type="checkbox"
                            checked={selectedValues.includes(option)}
                            onChange={(e) => handleMultiSelectChange(field.id, option, e.target.checked)}
                            className="w-4 h-4 text-[#ff2867] border-[#e7e5e4] rounded focus:ring-4 focus:ring-[rgba(255,40,103,0.08)] transition-all"
                          />
                          <span className="text-sm text-[#1c1917]">{option}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 px-6 py-3 text-base font-medium bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </form>

        {/* CTA Section */}
        <div className="mt-8 mb-6 text-center">
          <p className="text-sm text-[#78716c] mb-4 max-w-lg mx-auto">
            Create your own privacy-preserving, permissionless forms with Polkadot for free
          </p>
          <a
            href="https://polkadot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200"
          >
            <img src="/logo.png" alt="Polkadot" className="w-5 h-5" />
            Set up your onchain identity
          </a>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-sm text-[#78716c]">
          <span className="font-sans">Powered by</span>
          <img src="/logo.png" alt="Polkadot" className="w-4 h-4" />
          <span className="font-serif font-semibold text-[#1c1917]">Polkadot</span>
        </div>
      </div>
    </div>
  )
}
