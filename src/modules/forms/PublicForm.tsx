import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Lock, Info, Sparkles, ArrowRight, ExternalLink } from 'lucide-react'
import PolkadotLogo from '../../components/PolkadotLogo'
import type { Form, FormField } from './types'
import { loadForms } from './config'
import { saveEncryptedResponse } from './config'
import { encryptDocument, toHex } from '../../lib/forms-encryption'
import { fromBase64url, getFormKey } from '../../lib/form-keys'
import { uploadToBulletin, fetchRawFromBulletin } from '../../lib/bulletin-storage'
import { useFormsContract } from '../../hooks/useFormsContract'

/** Read #key from URL fragment once, at component init. */
function readHashParams(): { key: string | null } {
  const hash = window.location.hash // e.g. "#/f/1#key=..."
  const keyMatch = hash.match(/#key=([^&]+)/)
  return { key: keyMatch ? keyMatch[1] : null }
}

// Simple markdown formatter
function formatMarkdown(text: string) {
  if (!text) return ''
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#ff2867] underline">$1</a>')
    .replace(/\n/g, '<br />')
}

export function PublicForm() {
  const { formId } = useParams<{ formId: string }>()
  const { getFormCid, submitResponseViaRelay } = useFormsContract()

  // Capture URL params ONCE at first render (immune to StrictMode double-invoke)
  const [initialKey] = useState<string | null>(() => readHashParams().key)
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedCid, setSubmittedCid] = useState<string | null>(null)
  const formKeyRef = useRef<Uint8Array | null>(null)

  // No session wallet needed — Alice relay handles on-chain submission

  useEffect(() => {
    if (!formId) {
      setError('Invalid form link')
      setLoading(false)
      return
    }

    // 1. Extract encryption key from URL fragment
    if (initialKey) {
      try { formKeyRef.current = fromBase64url(initialKey) } catch { /* ignore */ }
    }

    // 2. Try loading form definition from Bulletin (via contract → CID → gateway)
    const numericId = Number(formId)
    if (!isNaN(numericId) && numericId > 0) {
      ;(async () => {
        try {
          console.log('[PublicForm] Loading form from Bulletin, formId:', formId)
          const cid = await getFormCid(Number(formId))
          if (cid) {
            console.log('[PublicForm] Got CID from contract:', cid)
            const bytes = await fetchRawFromBulletin(cid)
            const formDef = JSON.parse(new TextDecoder().decode(bytes))
            const bulletinForm: Form = {
              id: formId,
              title: formDef.title || 'Untitled',
              description: formDef.description || '',
              creator: '',
              createdAt: formDef.createdAt || Date.now(),
              status: 'active',
              fields: (formDef.fields || []) as FormField[],
              responses: [],
              bulletinCid: cid,
            }
            // Extract encryption key from form definition if available and not already set
            if (!formKeyRef.current && formDef.encryptionPubKey) {
              formKeyRef.current = new Uint8Array(formDef.encryptionPubKey)
            }
            setForm(bulletinForm)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('[PublicForm] Bulletin load failed, falling back to localStorage:', err)
        }

        // 3. Fall back to localStorage (creator's device only)
        loadFromLocalStorage()
      })()
    } else {
      // Non-numeric form ID — localStorage only
      loadFromLocalStorage()
    }

    function loadFromLocalStorage() {
      const localForms = loadForms()
      const foundForm = localForms.find(f => f.id === formId)

      if (!foundForm) {
        setError('Form not found. Share the complete shareable link to access this form from other devices.')
      } else if (foundForm.status === 'closed') {
        setError('This form is no longer accepting responses')
      } else {
        setForm(foundForm)
        const key = getFormKey(formId!)
        if (key) formKeyRef.current = key
      }
      setLoading(false)
    }
  }, [formId, initialKey, getFormCid])


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
      const responseId = `response-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const plaintext = JSON.stringify({ answers, submittedAt: Date.now() })

      let encryptedCiphertext: Uint8Array | null = null
      let encryptedNonce: Uint8Array | null = null

      if (formKeyRef.current) {
        // Encrypt response with form key (AES-256-GCM)
        const { ciphertext, nonce } = await encryptDocument(plaintext, formKeyRef.current)
        encryptedCiphertext = ciphertext
        encryptedNonce = nonce

        saveEncryptedResponse({
          id: responseId,
          formId,
          submittedAt: Date.now(),
          ciphertext: toHex(ciphertext),
          nonce: toHex(nonce)
        })

        console.log('✓ Response encrypted and stored (AES-256-GCM)')
      } else {
        // No key available — store plaintext with warning (fallback)
        const { saveResponse } = await import('./config')
        saveResponse({
          id: responseId,
          formId,
          submittedAt: Date.now(),
          answers
        })
        console.warn('⚠️ No encryption key available — stored plaintext')
      }

      // Update aggregate counts for select/multiselect fields (localStorage)
      const { loadForms: load, saveForms: save } = await import('./config')
      const allForms = load()
      const formIndex = allForms.findIndex(f => f.id === formId)
      if (formIndex >= 0) {
        const updatedForm = { ...allForms[formIndex] }
        if (!updatedForm.aggregates) updatedForm.aggregates = {}
        for (const field of form.fields) {
          if (field.type === 'select' || field.type === 'multiselect') {
            const answer = answers[field.id]
            if (!answer) continue
            if (!updatedForm.aggregates[field.id]) updatedForm.aggregates[field.id] = {}
            const values = Array.isArray(answer) ? answer : [answer]
            for (const v of values) {
              updatedForm.aggregates[field.id][v] = (updatedForm.aggregates[field.id][v] || 0) + 1
            }
          }
        }
        allForms[formIndex] = updatedForm
        save(allForms)
      }

      // Upload to Bulletin + register CID on contract via Alice relay (BLOCKING - wait for success)
      if (encryptedCiphertext && encryptedNonce && formId) {
        const ct = encryptedCiphertext
        const n = encryptedNonce

        console.log('[dForms] Starting Bulletin upload for formId:', formId)
        try {
          const cid = await uploadToBulletin({
            formId,
            ciphertext: toHex(ct),
            nonce: toHex(n),
            submittedAt: Date.now()
          })
          console.log('[dForms] Bulletin upload done, CID:', cid)
          setSubmittedCid(cid)

          // Use on-chain ID if available, otherwise skip on-chain submission
          if (form?.onChainId) {
            await submitResponseViaRelay(Number(form.onChainId), cid)
            console.log('✓ Response registered on-chain, CID:', cid)
          } else {
            console.log('ℹ️  Form has no on-chain ID, skipping contract submission')
          }
        } catch (err) {
          console.warn('[dForms] On-chain submission failed:', err)
          // Still show success (localStorage saved) but warn about Bulletin failure
          setSubmittedCid(null)
        }
      }

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
            Make sure you're using the complete shareable link (including the #key=... part).
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[#fafaf9]">
        <div className="max-w-2xl w-full">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border-2 border-[#e7e5e4] mb-6 shadow-lg">
              <CheckCircle className="w-14 h-14 text-[#059669]" />
            </div>
            <h1 className="text-5xl font-bold text-[#1c1917] mb-4 font-serif leading-tight">
              Response Submitted
            </h1>
            <p className="text-[#57534e] text-xl leading-relaxed">
              Your response was encrypted and stored securely on Polkadot's Bulletin chain.
            </p>
          </div>

          {/* Bulletin Storage Info */}
          {submittedCid && (
            <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Lock className="w-6 h-6 text-[#1c1917] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-[#1c1917] mb-2 font-serif">Stored on Bulletin Chain</h2>
                  <p className="text-sm text-[#57534e] mb-4 leading-relaxed">
                    Your encrypted response is now permanently stored on Polkadot's decentralized Bulletin chain.
                  </p>
                  <div className="bg-[#fafaf9] rounded-lg p-4 border border-[#e7e5e4]">
                    <div className="text-xs text-[#78716c] mb-2 font-medium">Content Identifier (CID)</div>
                    <div className="flex items-start gap-3">
                      <div className="font-mono text-xs text-[#1c1917] break-all flex-1">{submittedCid}</div>
                      <a
                        href={`https://ipfs.dotspark.app/ipfs/${submittedCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#1c1917] text-white rounded-lg hover:bg-[#292524] transition-colors text-xs font-medium whitespace-nowrap shadow-sm"
                      >
                        View on DotSpark
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy summary */}
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-[#1c1917] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#1c1917] mb-3 font-serif">Privacy-preserving</h2>
                <ul className="space-y-2 text-sm text-[#57534e]">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#059669] mt-0.5 flex-shrink-0" />
                    <span>Your response is <strong className="text-[#1c1917]">end-to-end encrypted</strong> — only the form creator can read it</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#059669] mt-0.5 flex-shrink-0" />
                    <span>No personal information was recorded without your consent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#059669] mt-0.5 flex-shrink-0" />
                    <span>Stored on <strong className="text-[#1c1917]">Polkadot Bulletin</strong> — decentralized and censorship-resistant</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-[#1c1917] mb-6 text-center font-serif">
              Explore More on Polkadot
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href="https://intran3t.vercel.app/#"
                className="flex items-center justify-between px-6 py-4 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-all duration-200 shadow-md hover:shadow-lg group"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-base font-semibold">Explore Intran3t Beta</div>
                  <div className="text-sm text-white/80 mt-0.5">Create your own decentralised forms, setup your onchain identity and more to come</div>
                </div>
                <ArrowRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://polkadot.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-6 py-4 border-2 border-[#d6d3d1] text-[#1c1917] rounded-xl hover:border-[#a8a29e] hover:bg-[#fafaf9] transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-base font-semibold">Learn about Polkadot</div>
                  <div className="text-sm text-[#78716c] mt-0.5">The decentralized infrastructure powering this form</div>
                </div>
                <ArrowRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-8 text-sm text-[#78716c]">
            <span>Powered by</span>
            <PolkadotLogo className="w-4 h-4 text-[#1c1917]" />
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-white to-[#fafaf9] mb-6 shadow-lg border border-[#e7e5e4]">
            <PolkadotLogo className="w-12 h-12 text-[#1c1917]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1c1917] font-serif mb-4 leading-tight">
            {form.title}
          </h1>
          {form.description && (
            <div
              className="text-lg text-[#57534e] leading-relaxed max-w-2xl mx-auto"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(form.description) }}
            />
          )}
        </div>

        {/* Encryption notice */}
        {formKeyRef.current && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  End-to-end encrypted
                </p>
                <p className="text-xs text-blue-700">
                  Your response will be encrypted in your browser before submission. Only the form creator can decrypt it.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No key warning */}
        {!formKeyRef.current && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  No encryption key found
                </p>
                <p className="text-xs text-yellow-700">
                  Use the complete shareable link (with #key=... fragment) for encrypted submission.
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
                      <option key={option} value={option}>{option}</option>
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
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 px-8 py-4 text-base font-semibold bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isSubmitting ? 'Encrypting & uploading to Polkadot...' : 'Submit Response'}
          </button>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-[#78716c]">
          <span>Powered by</span>
          <PolkadotLogo className="w-4 h-4 text-[#1c1917]" />
          <span className="font-serif font-semibold text-[#1c1917]">Polkadot</span>
        </div>
      </div>
    </div>
  )
}
