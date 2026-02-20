import { useState, useEffect } from 'react'
import { useTypink } from 'typink'
import { FileText, Plus, Link2, Trash2, X, Copy, CheckCircle, Edit, GripVertical, ExternalLink, AlertCircle } from 'lucide-react'
import type { Form, FormField, FormsConfig, FieldType } from './types'
import { loadForms, saveForms, defaultFormsConfig, FORMS_STORAGE_KEY, RESPONSES_STORAGE_KEY } from './config'
import { generateFormKey, saveFormKey } from '../../lib/form-keys'
import { useFormsContract } from '../../hooks/useFormsContract'
import { uploadRawToBulletin } from '../../lib/bulletin-storage'

export function FormsWidget({ config = defaultFormsConfig }: { config?: FormsConfig }) {
  const { connectedAccount, signer } = useTypink()
  const {
    isLoading: contractLoading,
    registerForm: contractRegisterForm,
    formCount: getFormCount
  } = useFormsContract()

  // Debug: Log what the hook returns
  useEffect(() => {
    console.log('[FormsWidget] Hook state:', { contractLoading, hasAccount: !!connectedAccount })
  }, [contractLoading, connectedAccount])
  const [activeTab, setActiveTab] = useState<'create' | 'submissions'>('create')
  const [forms, setForms] = useState<Form[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [lastOnChainId, setLastOnChainId] = useState<number>(0)

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [showFieldBuilder, setShowFieldBuilder] = useState(false)
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null)
  const [editingFormId, setEditingFormId] = useState<string | null>(null)

  // Field builder state
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [fieldPlaceholder, setFieldPlaceholder] = useState('')
  const [fieldRequired, setFieldRequired] = useState(false)
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')

  // UI state
  const [showLinkCopied, setShowLinkCopied] = useState<string | null>(null)
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null)
  const [contractWarning, setContractWarning] = useState<string | null>(null)

  useEffect(() => {
    setForms(loadForms())

    // Listen for storage changes from other tabs (e.g., form submissions)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FORMS_STORAGE_KEY || e.key === RESPONSES_STORAGE_KEY) {
        setForms(loadForms())
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const generateFormId = () => {
    return `form-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  const handleCreateForm = async () => {
    if (!formTitle.trim() || !connectedAccount || isCreating) return

    setIsCreating(true)
    setContractWarning(null)
    let updatedForms: Form[]

    try {
      if (editingFormId) {
        // Update existing form (local only — on-chain form definitions are immutable)
        updatedForms = forms.map(f =>
          f.id === editingFormId
            ? { ...f, title: formTitle.trim(), description: formDescription.trim(), fields }
            : f
        )
      } else {
        // Generate AES-256 encryption key for this form (moved outside scope)
        const formKey = generateFormKey()

        // Predict on-chain form ID (formCount + 1) and register on contract
        let formId: string

        console.log('[dForms] Contract check:', { contractLoading })

        let onChainMetadata: { onChainId?: string; onChainTimestamp?: number; signerAddress?: string; bulletinCid?: string } = {}

        if (!contractLoading) {
          try {
            console.log('[dForms] Uploading form definition to Bulletin (via Alice relay)...')
            console.log('[dForms] formKey exists:', !!formKey, 'length:', formKey?.length)

            // 1. Build form definition JSON
            const formDef = {
              title: formTitle.trim(),
              description: formDescription.trim(),
              fields,
              encryptionPubKey: Array.from(formKey),
              createdAt: Date.now(),
            }
            const formDefBytes = new TextEncoder().encode(JSON.stringify(formDef))

            // 2. Upload to Bulletin (via Alice relay - acceptable for testnet, form def is public data)
            const formCID = await uploadRawToBulletin(formDefBytes)
            console.log('[dForms] Bulletin upload done, CID:', formCID)

            // 3. Register CID on contract
            const currentCount = await getFormCount()
            const predictedOnChainId = Math.max(Number(currentCount) + 1, lastOnChainId + 1)
            const timestamp = Date.now()

            await contractRegisterForm(formCID)
            console.log('✅ Form registered on-chain, id:', predictedOnChainId, 'CID:', formCID)
            setLastOnChainId(predictedOnChainId)

            // Use unique local ID to avoid React key collisions
            formId = generateFormId()

            onChainMetadata = {
              onChainId: predictedOnChainId.toString(),
              onChainTimestamp: timestamp,
              signerAddress: connectedAccount.address,
              bulletinCid: formCID,
            }
          } catch (contractErr) {
            const msg = contractErr instanceof Error ? contractErr.message : String(contractErr)
            console.error('❌ Bulletin/contract call failed:', contractErr)
            console.error('Stack trace:', contractErr instanceof Error ? contractErr.stack : 'N/A')
            setContractWarning(msg)
            formId = generateFormId()
          }
        } else {
          console.log('[dForms] Creating form locally - contractLoading:', contractLoading)
          formId = generateFormId()
        }

        saveFormKey(formId, formKey)
        updatedForms = [
          {
            id: formId,
            title: formTitle.trim(),
            description: formDescription.trim(),
            creator: connectedAccount.address,
            createdAt: Date.now(),
            status: 'active',
            fields,
            responses: [],
            aggregates: {},
            ...onChainMetadata
          },
          ...forms
        ]
      }

      setForms(updatedForms)
      saveForms(updatedForms)
      setFormTitle('')
      setFormDescription('')
      setFields([])
      setEditingFormId(null)
      setActiveTab('submissions')
    } catch (err) {
      console.error('Failed to create form:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleAddField = () => {
    if (!fieldLabel.trim()) return

    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: fieldType,
      label: fieldLabel.trim(),
      placeholder: fieldPlaceholder.trim() || undefined,
      required: fieldRequired,
      options: (fieldType === 'select' || fieldType === 'multiselect') ? fieldOptions : undefined
    }

    if (editingFieldIndex !== null) {
      const updatedFields = [...fields]
      updatedFields[editingFieldIndex] = newField
      setFields(updatedFields)
      setEditingFieldIndex(null)
    } else {
      setFields([...fields, newField])
    }

    // Reset field builder
    setFieldLabel('')
    setFieldType('text')
    setFieldPlaceholder('')
    setFieldRequired(false)
    setFieldOptions([])
    setNewOption('')
    setShowFieldBuilder(false)
  }

  const handleEditField = (index: number) => {
    const field = fields[index]
    setFieldLabel(field.label)
    setFieldType(field.type)
    setFieldPlaceholder(field.placeholder || '')
    setFieldRequired(field.required)
    setFieldOptions(field.options || [])
    setNewOption('')
    setEditingFieldIndex(index)
    setShowFieldBuilder(true)
  }

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const handleCopyLink = async (formId: string) => {
    const form = forms.find(f => f.id === formId)
    if (!form) return

    const { getFormKey } = await import('../../lib/form-keys')
    const formKey = getFormKey(formId)

    // Use on-chain ID if available (shareable across devices), otherwise use local UUID
    const shareableId = form.onChainId ? String(form.onChainId) : formId

    let link: string
    if (formKey) {
      // Generate shareable link with on-chain ID + encryption key
      const { toBase64url } = await import('../../lib/form-keys')
      const keyEncoded = toBase64url(formKey)
      link = `${window.location.origin}/#/f/${shareableId}#key=${keyEncoded}`
    } else {
      // Fallback: simple link (voter must be on same device as creator)
      link = `${window.location.origin}/#/f/${shareableId}`
    }

    try {
      await navigator.clipboard.writeText(link)
      setShowLinkCopied(formId)
      setTimeout(() => setShowLinkCopied(null), 2000)
    } catch (e) {
      console.error('Failed to copy link:', e)
    }
  }

  const handleDeleteForm = (formId: string) => {
    const updatedForms = forms.filter(f => f.id !== formId)
    setForms(updatedForms)
    saveForms(updatedForms)
  }

  const handleToggleStatus = (formId: string) => {
    const updatedForms = forms.map(f =>
      f.id === formId ? { ...f, status: f.status === 'active' ? 'closed' as const : 'active' as const } : f
    )
    setForms(updatedForms)
    saveForms(updatedForms)
  }

  const handleEditForm = (formId: string) => {
    const form = forms.find(f => f.id === formId)
    if (!form) return

    setFormTitle(form.title)
    setFormDescription(form.description)
    setFields(form.fields)
    setEditingFormId(formId)
    setActiveTab('create')
  }

  const handleCancelEdit = () => {
    setFormTitle('')
    setFormDescription('')
    setFields([])
    setEditingFormId(null)
  }

  const myForms = forms.filter(f => f.creator === connectedAccount?.address)

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] font-serif">
            {config.title || 'Forms'}
          </h2>
          <p className="text-xs text-[#78716c] mt-0.5">
            {config.description || 'Create forms and collect responses'}
          </p>
        </div>
        <FileText className="w-5 h-5 text-[#78716c]" />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4 bg-[#fafaf9] p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
            activeTab === 'create'
              ? 'bg-white text-[#1c1917] shadow-sm'
              : 'text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          Create Form
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
            activeTab === 'submissions'
              ? 'bg-white text-[#1c1917] shadow-sm'
              : 'text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          View Forms ({myForms.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'create' && (
          <div className="space-y-4">
            {!connectedAccount ? (
              <div className="text-center py-8 text-[#78716c] text-sm">
                Connect your wallet to create forms
              </div>
            ) : (
              <>
                {/* Form Title */}
                <div>
                  <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                    Form Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter form title"
                    className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all duration-200"
                  />
                </div>

                {/* Form Description */}
                <div>
                  <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Use **bold**, *italic*, or [link](url) for formatting"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] resize-none transition-all duration-200 font-mono"
                  />
                  <p className="text-xs text-[#78716c] mt-1">
                    Supports markdown: **bold**, *italic*, [links](url)
                  </p>
                </div>

                {/* Fields List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[#1c1917]">
                      Form Fields ({fields.length})
                    </label>
                    <button
                      onClick={() => setShowFieldBuilder(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1c1917] text-white rounded-lg hover:bg-[#292524] transition-colors duration-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Field
                    </button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-6 text-[#a8a29e] text-xs border border-dashed border-[#e7e5e4] rounded-lg">
                      No fields yet. Add a field to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-2 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[#1c1917]">
                              {field.label}
                              {field.required && <span className="text-[#dc2626] ml-1">*</span>}
                            </div>
                            <div className="text-xs text-[#78716c] mt-0.5">
                              {field.type}
                              {field.placeholder && ` • ${field.placeholder}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditField(index)}
                              className="p-1 text-[#78716c] hover:text-[#1c1917] transition-colors duration-200"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveField(index)}
                              className="p-1 text-[#78716c] hover:text-[#dc2626] transition-colors duration-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Field Builder Modal */}
                {showFieldBuilder && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold font-serif text-[#1c1917]">
                          {editingFieldIndex !== null ? 'Edit Field' : 'Add Field'}
                        </h3>
                        <button
                          onClick={() => {
                            setShowFieldBuilder(false)
                            setEditingFieldIndex(null)
                          }}
                          className="text-[#78716c] hover:text-[#1c1917]"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                            Field Label *
                          </label>
                          <input
                            type="text"
                            value={fieldLabel}
                            onChange={(e) => setFieldLabel(e.target.value)}
                            placeholder="e.g., Email Address"
                            className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                            Field Type
                          </label>
                          <select
                            value={fieldType}
                            onChange={(e) => setFieldType(e.target.value as FieldType)}
                            className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all duration-200"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="select">Select (dropdown)</option>
                            <option value="multiselect">Multi-select (checkboxes)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={fieldPlaceholder}
                            onChange={(e) => setFieldPlaceholder(e.target.value)}
                            placeholder="Optional placeholder text"
                            className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all duration-200"
                          />
                        </div>

                        {(fieldType === 'select' || fieldType === 'multiselect') && (
                          <div>
                            <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                              Options
                            </label>
                            <div className="space-y-2">
                              {fieldOptions.map((option, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <GripVertical className="w-4 h-4 text-[#a8a29e] flex-shrink-0" />
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                      const updated = [...fieldOptions]
                                      updated[idx] = e.target.value
                                      setFieldOptions(updated)
                                    }}
                                    className="flex-1 px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all duration-200"
                                    placeholder={`Option ${idx + 1}`}
                                  />
                                  <button
                                    onClick={() => setFieldOptions(fieldOptions.filter((_, i) => i !== idx))}
                                    className="p-2 text-[#78716c] hover:text-[#dc2626] transition-colors duration-200"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => setFieldOptions([...fieldOptions, ''])}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#78716c] border border-dashed border-[#e7e5e4] rounded-lg hover:border-[#d6d3d1] hover:text-[#1c1917] transition-colors duration-200"
                              >
                                <Plus className="w-4 h-4" />
                                Add option
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="fieldRequired"
                            checked={fieldRequired}
                            onChange={(e) => setFieldRequired(e.target.checked)}
                            className="w-4 h-4 text-[#1c1917] border-[#e7e5e4] rounded focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all duration-200"
                          />
                          <label htmlFor="fieldRequired" className="text-sm text-[#1c1917]">
                            Required field
                          </label>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => {
                              setShowFieldBuilder(false)
                              setEditingFieldIndex(null)
                            }}
                            className="flex-1 px-4 py-2 text-sm border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddField}
                            disabled={!fieldLabel.trim()}
                            className="flex-1 px-4 py-2 text-sm bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {editingFieldIndex !== null ? 'Update' : 'Add'} Field
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Error Alert */}
                {contractWarning && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">Failed to register on-chain</p>
                        <p className="text-xs text-red-700 mt-1">{contractWarning}</p>
                        <p className="text-xs text-red-600 mt-2">Form was saved locally only. You can still use it on this device.</p>
                      </div>
                      <button
                        onClick={() => setContractWarning(null)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Create/Update Buttons */}
                <div className="flex gap-3">
                  {editingFormId && (
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-6 py-3 text-sm font-semibold border-2 border-[#d6d3d1] text-[#1c1917] rounded-xl hover:border-[#a8a29e] hover:bg-[#fafaf9] transition-all duration-200"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleCreateForm}
                    disabled={!formTitle.trim() || fields.length === 0 || isCreating}
                    className="flex-1 px-8 py-4 text-base font-semibold bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {isCreating ? 'Publishing to Polkadot...' : editingFormId ? 'Update Form' : 'Create Form'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-3">
            {myForms.length === 0 ? (
              <div className="text-center py-12 text-[#78716c] text-sm">
                <FileText className="w-12 h-12 mx-auto mb-3 text-[#a8a29e]" />
                <p>No forms yet</p>
                <p className="text-xs mt-1">Create your first form to get started</p>
              </div>
            ) : (
              myForms.map((form) => (
                <div
                  key={form.id}
                  className="border border-[#e7e5e4] rounded-xl p-4 hover:border-grey-300 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1c1917] text-sm">
                        {form.title}
                        {form.onChainId && (
                          <span className="ml-2 text-xs font-mono text-[#a8a29e]">
                            #{form.onChainId}
                          </span>
                        )}
                      </h3>
                      {form.description && (
                        <p className="text-xs text-[#78716c] mt-1">
                          {form.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          form.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {form.status}
                        </span>
                        <span className="text-xs text-[#78716c]">
                          {form.responses.length} response{form.responses.length !== 1 ? 's' : ''}
                        </span>
                        {form.bulletinCid && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700" title={`Form definition CID: ${form.bulletinCid}`}>
                            ⛓️ On-chain
                          </span>
                        )}
                      </div>
                      {form.signerAddress && (
                        <div className="text-xs text-[#a8a29e] mt-1 font-mono">
                          Signer: {form.signerAddress.slice(0, 6)}...{form.signerAddress.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(form.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
                    >
                      {showLinkCopied === form.id ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <a
                      href={`#/admin/forms/${form.onChainId || form.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Results
                    </a>
                    <button
                      onClick={() => handleEditForm(form.id)}
                      className="p-1.5 text-[#78716c] hover:text-[#1c1917] transition-colors duration-200"
                      title="Edit form"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(form.id)}
                      className="px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-grey-50 hover:border-grey-300 transition-all duration-200"
                    >
                      {form.status === 'active' ? 'Close' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="p-1.5 text-[#78716c] hover:text-[#dc2626] transition-colors duration-200"
                      title="Delete form"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Expanded Responses */}
                  {expandedFormId === form.id && form.responses.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#e7e5e4] space-y-2">
                      {form.responses.map((response) => (
                        <div key={response.id} className="bg-[#fafaf9] rounded-lg p-3">
                          <div className="text-xs text-[#78716c] mb-2">
                            {new Date(response.submittedAt).toLocaleString()}
                          </div>
                          <div className="space-y-1.5">
                            {form.fields.map((field) => {
                              const answer = response.answers[field.id]
                              const displayValue = answer
                                ? Array.isArray(answer)
                                  ? answer.join(', ')
                                  : answer
                                : null

                              return (
                                <div key={field.id}>
                                  <div className="text-xs font-medium text-[#1c1917]">
                                    {field.label}:
                                  </div>
                                  <div className="text-xs text-[#78716c]">
                                    {displayValue || <em className="text-[#a8a29e]">No answer</em>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
