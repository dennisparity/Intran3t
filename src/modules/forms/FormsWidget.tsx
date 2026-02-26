import { useState, useEffect } from 'react'
import { useWallet } from '../../providers/WalletProvider'
import { FileText, Plus, Link2, Trash2, X, Copy, CheckCircle, Edit, GripVertical, ExternalLink, AlertCircle, Lock } from 'lucide-react'
import type { Form, FormField, FormsConfig, FieldType } from './types'
import { loadForms, saveForms, defaultFormsConfig, FORMS_STORAGE_KEY, RESPONSES_STORAGE_KEY } from './config'
import { generateFormKey, saveFormKey } from '../../lib/form-keys'
import { useFormsContract } from '../../hooks/useFormsContract'
import { uploadRawToBulletin } from '../../lib/bulletin-storage'
import { useSubstrateEVMSigner } from '../../hooks/useSubstrateEVMSigner'
import { useAccountMapping } from '../../hooks/useAccountMapping'
import { MapAccountModal } from '../../components/MapAccountModal'
import { encodeFunctionData } from 'viem'

export function FormsWidget({ config = defaultFormsConfig }: { config?: FormsConfig }) {
  const { selectedAccount, signer } = useWallet()
  const {
    isLoading: contractLoading,
    registerForm: contractRegisterForm,
    formCount: getFormCount,
    getResponseCount
  } = useFormsContract()

  // Substrate EVM signer for contract calls
  const substrateEVM = useSubstrateEVMSigner()

  // Account mapping check
  const accountMapping = useAccountMapping(selectedAccount?.address)

  // UI state for mapping modal
  const [showMapModal, setShowMapModal] = useState(false)

  // Debug: Log what the hook returns
  useEffect(() => {
    console.log('[FormsWidget] Hook state:', { contractLoading, hasAccount: !!selectedAccount })
  }, [contractLoading, selectedAccount])
  const [activeTab, setActiveTab] = useState<'create' | 'submissions'>('create')
  const [forms, setForms] = useState<Form[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [creationStatus, setCreationStatus] = useState<string>('')
  const [lastOnChainId, setLastOnChainId] = useState<number>(0)
  const [onChainCounts, setOnChainCounts] = useState<Record<string, number>>({})

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

  // Fetch on-chain response counts for forms
  useEffect(() => {
    const myForms = forms.filter(f => f.creator === selectedAccount?.address)
    if (myForms.length === 0) return
    const numericForms = myForms.filter(f => !isNaN(Number(f.onChainId || f.id)))
    if (numericForms.length === 0) return
    Promise.allSettled(
      numericForms.map(async f => {
        const id = f.onChainId || f.id
        const count = await getResponseCount(Number(id))
        return { id: f.id, count: Number(count) }
      })
    ).then(results => {
      const counts: Record<string, number> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') counts[r.value.id] = r.value.count
      }
      setOnChainCounts(counts)
    })
  }, [forms, selectedAccount?.address, getResponseCount])

  const generateFormId = () => {
    return `form-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  const handleCreateForm = async () => {
    if (!formTitle.trim() || !selectedAccount || isCreating) return

    setIsCreating(true)
    setCreationStatus('Preparing form...')
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
            setCreationStatus('Uploading form to Bulletin...')

            // 1. Build form definition JSON
            const formDef = {
              title: formTitle.trim(),
              description: formDescription.trim(),
              fields,
              encryptionPubKey: Array.from(formKey),
              createdAt: Date.now(),
            }
            const formDefBytes = new TextEncoder().encode(JSON.stringify(formDef))

            // 2. Upload to Bulletin (via Alice relay - consistent with voter submissions)
            const formCID = await uploadRawToBulletin(formDefBytes)
            console.log('[dForms] Bulletin upload done, CID:', formCID)

            // 3. Check account mapping and auto-map if needed
            if (!selectedAccount) {
              throw new Error('Please connect a wallet first')
            }

            // Check if account is mapped, if not (or unknown), map it automatically
            // null = check failed (metadata mismatch) — treat same as false and attempt mapping
            if (accountMapping.isMapped !== true) {
              console.log('🗺️ Account not mapped (or status unknown), mapping automatically...')
              setCreationStatus('step:map')

              try {
                await accountMapping.mapAccount()
                console.log('✅ Account mapped successfully')
                setCreationStatus('step:register')
              } catch (mapErr) {
                // If mapping fails because already mapped, continue — don't block
                const errMsg = mapErr instanceof Error ? mapErr.message : 'Unknown error'
                if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('mapped')) {
                  console.log('ℹ️ Account already mapped, continuing...')
                  setCreationStatus('step:register')
                } else {
                  throw new Error(`Failed to map account: ${errMsg}`)
                }
              }
            } else {
              setCreationStatus('step:register')
            }

            // 4. Register CID on contract
            const currentCount = await getFormCount()
            const predictedOnChainId = Math.max(Number(currentCount) + 1, lastOnChainId + 1)
            const timestamp = Date.now()

            // Use the logged-in wallet for contract call
            setCreationStatus('step:confirming')
            console.log('[dForms] Registering form on-chain with connected wallet...')
            const rawAddress = (import.meta.env.VITE_FORMS_CONTRACT_ADDRESS as string || '').trim()
            // Ensure 0x prefix (Vercel may strip it)
            const contractAddress = (rawAddress.startsWith('0x') ? rawAddress : `0x${rawAddress}`) as `0x${string}`

            // Encode registerForm(string formCid) call
            const calldata = encodeFunctionData({
              abi: [{
                name: 'registerForm',
                type: 'function',
                inputs: [{ name: 'formCid', type: 'string' }],
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'nonpayable'
              }],
              functionName: 'registerForm',
              args: [formCID]
            })

            await substrateEVM.sendTransaction({
              to: contractAddress,
              data: calldata,
              value: 0n
            })
            console.log('✅ Form registered on-chain, id:', predictedOnChainId, 'CID:', formCID)
            setLastOnChainId(predictedOnChainId)

            // Use unique local ID to avoid React key collisions
            formId = generateFormId()

            onChainMetadata = {
              onChainId: predictedOnChainId.toString(),
              onChainTimestamp: timestamp,
              signerAddress: selectedAccount.address,
              bulletinCid: formCID,
            }
          } catch (contractErr) {
            const msg = contractErr instanceof Error ? contractErr.message : String(contractErr)
            console.error('❌ Bulletin/contract call failed:', contractErr)
            console.error('Stack trace:', contractErr instanceof Error ? contractErr.stack : 'N/A')

            // Check if it's a BadProof or mapping error - these are critical
            if (msg.includes('BadProof') || msg.includes('mapping') || msg.includes('Failed to map account')) {
              // Don't save form locally, throw error to user
              throw new Error(`Form creation failed: ${msg}. Please try again or contact support.`)
            }

            // For other errors, show warning but allow local-only form
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
            creator: selectedAccount.address,
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
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      alert(`Failed to create form: ${errorMsg}`)
    } finally {
      setIsCreating(false)
      setCreationStatus('')
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

  const myForms = forms.filter(f => f.creator === selectedAccount?.address)

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
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
      <div className="flex gap-1 mb-3 bg-[#fafaf9] p-1 rounded-lg">
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
          <div className="space-y-3">
            {!selectedAccount ? (
              <div className="text-center py-8 text-[#78716c] text-sm">
                Connect your wallet to create forms
              </div>
            ) : (
              <>
                {/* Form Title */}
                <div>
                  <label className="block text-xs font-medium text-[#1c1917] mb-1">
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
                  <label className="block text-xs font-medium text-[#1c1917] mb-1">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Use **bold**, *italic*, or [link](url) for formatting"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] resize-none transition-all duration-200 font-mono"
                  />
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
                    <div className="text-center py-4 text-[#a8a29e] text-xs border border-dashed border-[#e7e5e4] rounded-lg">
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

                {/* Account Mapping Gate (if Substrate wallet is not mapped) */}
                {selectedAccount && accountMapping.isMapped === false && (
                  <div className="mb-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Lock className="w-5 h-5 text-[#1c1917] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#1c1917]">Account Mapping Required</p>
                        <p className="text-xs text-[#57534e] mt-0.5">
                          Map your Substrate account to publish forms on-chain.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="w-full py-2 px-4 bg-[#1c1917] text-white text-sm font-medium rounded-lg hover:bg-[#292524] transition-colors"
                    >
                      Map Account
                    </button>
                  </div>
                )}

                {/* First-time setup notice — only shown when confirmed unmapped */}
                {selectedAccount && accountMapping.isMapped === false && !isCreating && !editingFormId && (
                  <div className="mb-3 flex items-start gap-2.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3">
                    <div className="w-4 h-4 rounded-full bg-[#1c1917] text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">i</div>
                    <div>
                      <p className="text-xs font-semibold text-[#1c1917]">First-time setup: 2 wallet signatures required</p>
                      <p className="text-xs text-[#78716c] mt-0.5">
                        <span className="font-medium">1.</span> Map your account <span className="text-[#a8a29e]">(one-time, ~30s)</span>
                        <span className="mx-1.5 text-[#d6d3d1]">·</span>
                        <span className="font-medium">2.</span> Register form on-chain
                      </p>
                    </div>
                  </div>
                )}

                {/* Step indicator during creation */}
                {isCreating && accountMapping.isMapped === false && (
                  <div className="mb-3 border border-[#e7e5e4] rounded-xl overflow-hidden">
                    {[
                      { key: 'step:map', label: 'Map account', sub: 'Sign in your wallet — one-time setup' },
                      { key: 'step:register', label: 'Register form on-chain', sub: 'Confirm the transaction in your wallet' },
                    ].map((step, i) => {
                      const steps = ['step:map', 'step:register', 'step:confirming']
                      const currentIdx = steps.indexOf(creationStatus)
                      const stepIdx = steps.indexOf(step.key)
                      const done = currentIdx > stepIdx
                      const active = currentIdx === stepIdx
                      return (
                        <div key={step.key} className={`flex items-center gap-3 px-3 py-2.5 ${i === 0 ? '' : 'border-t border-[#e7e5e4]'} ${active ? 'bg-white' : ''}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${done ? 'bg-[#44403c] text-white' : active ? 'bg-[#1c1917] text-white' : 'bg-[#e7e5e4] text-[#a8a29e]'}`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${active ? 'text-[#1c1917]' : done ? 'text-[#78716c]' : 'text-[#a8a29e]'}`}>{step.label}</p>
                            {active && <p className="text-xs text-[#78716c] mt-0.5">{step.sub}</p>}
                          </div>
                          {active && <div className="w-3 h-3 border-2 border-[#1c1917] border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                        </div>
                      )
                    })}
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
                    disabled={
                      !formTitle.trim() ||
                      fields.length === 0 ||
                      isCreating
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-8 py-3 text-base font-semibold bg-gradient-to-r from-[#1c1917] to-[#292524] text-white rounded-xl hover:from-[#292524] hover:to-[#1c1917] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-5 h-5" />
                    {isCreating
                      ? creationStatus === 'step:map' ? 'Mapping account...'
                        : creationStatus === 'step:register' ? 'Registering form...'
                        : creationStatus === 'step:confirming' ? 'Confirming on-chain...'
                        : 'Publishing to Polkadot...'
                      : editingFormId ? 'Update Form' : 'Create Form'}
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
                          {onChainCounts[form.id] !== undefined
                            ? `${onChainCounts[form.id]} response${onChainCounts[form.id] !== 1 ? 's' : ''}`
                            : `${form.responses.length} response${form.responses.length !== 1 ? 's' : ''}`
                          }
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(form.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
                    >
                      {showLinkCopied === form.id ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Link
                        </>
                      )}
                    </button>
                    <a
                      href={`#/admin/forms/${form.onChainId || form.id}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
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
                      className="px-2 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-grey-50 hover:border-grey-300 transition-all duration-200"
                    >
                      {form.status === 'active' ? 'Close' : 'Open'}
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

      {/* Account Mapping Modal */}
      {showMapModal && substrateEVM.evmAddress && (
        <MapAccountModal
          evmAddress={substrateEVM.evmAddress}
          onClose={() => setShowMapModal(false)}
          onSuccess={() => {
            setShowMapModal(false)
            // Mapping state will auto-refresh via useAccountMapping hook
          }}
          onMap={accountMapping.mapAccount}
        />
      )}
    </div>
  )
}
