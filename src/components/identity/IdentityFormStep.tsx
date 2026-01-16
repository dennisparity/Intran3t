import { useState } from 'react'
import { Button } from '../ui/Button'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import type { IdentityFormData } from '../../modules/profile/identity-transaction-helpers'

interface IdentityFormStepProps {
  onNext: (data: IdentityFormData) => void
  onBack: () => void
  initialData?: Partial<IdentityFormData>
}

export function IdentityFormStep({ onNext, onBack, initialData }: IdentityFormStepProps) {
  const [formData, setFormData] = useState<IdentityFormData>({
    display: initialData?.display || '',
    legal: initialData?.legal || '',
    email: initialData?.email || '',
    web: initialData?.web || '',
    twitter: initialData?.twitter || '',
    matrix: initialData?.matrix || '',
    github: initialData?.github || '',
    discord: initialData?.discord || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof IdentityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    // Display name is required
    if (!formData.display || formData.display.trim() === '') {
      newErrors.display = 'Display name is required'
    } else if (formData.display.length > 32) {
      newErrors.display = 'Display name must be 32 characters or less'
    }

    // Matrix is required
    if (!formData.matrix || formData.matrix.trim() === '') {
      newErrors.matrix = 'Matrix handle is required'
    } else if (formData.matrix.length > 32) {
      newErrors.matrix = 'Matrix must be 32 characters or less'
    }

    // Optional field validations
    if (formData.legal && formData.legal.length > 32) {
      newErrors.legal = 'Legal name must be 32 characters or less'
    }
    if (formData.email && formData.email.length > 32) {
      newErrors.email = 'Email must be 32 characters or less'
    }
    if (formData.web && formData.web.length > 32) {
      newErrors.web = 'Website must be 32 characters or less'
    }
    if (formData.twitter && formData.twitter.length > 32) {
      newErrors.twitter = 'Twitter must be 32 characters or less'
    }
    if (formData.github && formData.github.length > 32) {
      newErrors.github = 'GitHub must be 32 characters or less'
    }
    if (formData.discord && formData.discord.length > 32) {
      newErrors.discord = 'Discord must be 32 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext(formData)
    }
  }

  const fieldCount = Object.values(formData).filter(v => v && v.trim() !== '').length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <h2 className="text-2xl font-bold text-[#1c1917] font-serif">
          Your Identity Information
        </h2>
        <p className="text-sm text-[#78716c] mt-1">
          Fill in your details. Display name and Matrix handle are required.
        </p>
      </div>

      {/* Info banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <strong>Character limit:</strong> Each field has a 32 character maximum.
          You have filled {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}.
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Display Name - Required */}
        <div>
          <label className="block text-sm font-semibold text-[#1c1917] mb-1.5">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.display}
            onChange={(e) => handleChange('display', e.target.value)}
            placeholder="John Doe"
            maxLength={32}
            className={`w-full px-3 py-2 border rounded-lg text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all ${
              errors.display ? 'border-red-500' : 'border-[#e7e5e4]'
            }`}
          />
          {errors.display && (
            <p className="text-xs text-red-600 mt-1">{errors.display}</p>
          )}
          <p className="text-xs text-[#78716c] mt-1">
            Your public display name on Intran3t and all other Polkadot-based applications
          </p>
        </div>

        {/* Legal Name - Optional */}
        <div>
          <label className="block text-sm font-semibold text-[#1c1917] mb-1.5">
            Legal Name
          </label>
          <input
            type="text"
            value={formData.legal}
            onChange={(e) => handleChange('legal', e.target.value)}
            placeholder="John Michael Doe"
            maxLength={32}
            className={`w-full px-3 py-2 border rounded-lg text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all ${
              errors.legal ? 'border-red-500' : 'border-[#e7e5e4]'
            }`}
          />
          {errors.legal && (
            <p className="text-xs text-red-600 mt-1">{errors.legal}</p>
          )}
        </div>

        {/* Email - Optional */}
        <div>
          <label className="block text-sm font-semibold text-[#1c1917] mb-1.5">
            Email
          </label>
          <input
            type="text"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john@example.com"
            maxLength={32}
            className={`w-full px-3 py-2 border rounded-lg text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all ${
              errors.email ? 'border-red-500' : 'border-[#e7e5e4]'
            }`}
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Twitter - Optional */}
        <div>
          <label className="block text-sm font-semibold text-[#1c1917] mb-1.5">
            Twitter
          </label>
          <input
            type="text"
            value={formData.twitter}
            onChange={(e) => handleChange('twitter', e.target.value)}
            placeholder="@johndoe"
            maxLength={32}
            className={`w-full px-3 py-2 border rounded-lg text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all ${
              errors.twitter ? 'border-red-500' : 'border-[#e7e5e4]'
            }`}
          />
          {errors.twitter && (
            <p className="text-xs text-red-600 mt-1">{errors.twitter}</p>
          )}
        </div>

        {/* Matrix - Required */}
        <div>
          <label className="block text-sm font-semibold text-[#1c1917] mb-1.5">
            Matrix <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.matrix}
            onChange={(e) => handleChange('matrix', e.target.value)}
            placeholder="@john:matrix.org"
            maxLength={32}
            className={`w-full px-3 py-2 border rounded-lg text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all ${
              errors.matrix ? 'border-red-500' : 'border-[#e7e5e4]'
            }`}
          />
          {errors.matrix && (
            <p className="text-xs text-red-600 mt-1">{errors.matrix}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#e7e5e4]">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="default"
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </form>
  )
}
