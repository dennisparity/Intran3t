import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'
import type { Form, FormResponse } from './types'
import { loadForms, saveForms, saveResponse } from './config'

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

  useEffect(() => {
    if (!formId) {
      setError('Invalid form link')
      setLoading(false)
      return
    }

    const forms = loadForms()
    const foundForm = forms.find(f => f.id === formId)

    if (!foundForm) {
      setError('Form not found')
    } else if (foundForm.status === 'closed') {
      setError('This form is no longer accepting responses')
    } else {
      setForm(foundForm)
    }

    setLoading(false)
  }, [formId])

  const handleSubmit = (e: React.FormEvent) => {
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

    // Create response
    const response: FormResponse = {
      id: `response-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      formId,
      submittedAt: Date.now(),
      answers
    }

    // Save response
    saveResponse(response)

    // Update form with response count
    const forms = loadForms()
    const updatedForms = forms.map(f =>
      f.id === formId
        ? { ...f, responses: [...f.responses, response] }
        : f
    )
    saveForms(updatedForms)

    setSubmitted(true)
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

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#1c1917] mb-3 font-serif">
            Thank You!
          </h1>
          <p className="text-[#78716c] mb-6">
            Your response has been submitted successfully
          </p>

          {/* Security & Privacy Info */}
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-8 text-left">
            <h2 className="text-sm font-semibold text-[#1c1917] mb-3">🔐 Privacy & Security</h2>
            <ul className="space-y-2 text-sm text-[#78716c]">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Encrypted:</strong> Your responses are encrypted and only the form creator can decrypt them</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>On-chain:</strong> Stored on Polkadot's decentralized network (no centralized servers)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Auto-delete:</strong> Data is automatically deleted after 2 weeks for privacy</span>
              </li>
            </ul>
          </div>

          {/* CTA Section */}
          <div className="mb-8">
            <p className="text-sm text-[#78716c] mb-4">
              Create your own privacy preserving, permissionless forms with Polkadot for free
            </p>
            <a
              href="https://polkadot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200"
            >
              <img src="/logo.png" alt="Polkadot" className="w-5 h-5" />
              Get started with Polkadot
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
            className="w-full mt-8 px-6 py-3 text-base font-medium bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200"
          >
            Submit Response
          </button>
        </form>

        {/* CTA Section */}
        <div className="mt-8 mb-6 text-center">
          <p className="text-sm text-[#78716c] mb-4 max-w-lg mx-auto">
            Create your own privacy preserving, permissionless forms with Polkadot for free
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
