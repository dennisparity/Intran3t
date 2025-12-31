import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'
import type { Form, FormResponse } from './types'
import { loadForms, saveForms, saveResponse } from './config'

export function PublicForm() {
  const { formId } = useParams<{ formId: string }>()
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
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
      .find(f => !answers[f.id]?.trim())

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

  const handleChange = (fieldId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
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
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-[#ff2867]" />
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
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#1c1917] mb-3 font-serif">
            Thank You!
          </h1>
          <p className="text-[#78716c] mb-8">
            Your response has been recorded on Polkadot
          </p>

          {/* CTA Section */}
          <div className="mb-8">
            <p className="text-sm text-[#78716c] mb-4">
              Create your own privacy preserving, permissionless forms with Polkadot for free
            </p>
            <a
              href="https://polkadot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium bg-gradient-to-r from-[#E6007A] to-[#552BBF] text-white rounded-lg hover:opacity-90 transition-opacity shadow-lg"
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
            <p className="text-[#78716c]">
              {form.description}
            </p>
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
                    value={answers[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2.5 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
                  />
                )}

                {field.type === 'email' && (
                  <input
                    type="email"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2.5 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={answers[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent resize-none"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={answers[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-2.5 border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
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
            className="w-full mt-8 px-6 py-3 text-base font-medium bg-gradient-to-r from-[#E6007A] to-[#552BBF] text-white rounded-lg hover:opacity-90 transition-opacity"
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
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium bg-gradient-to-r from-[#E6007A] to-[#552BBF] text-white rounded-lg hover:opacity-90 transition-opacity shadow-lg"
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
