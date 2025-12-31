import { useState, useEffect } from 'react'
import { useTypink } from 'typink'
import { FileText, Plus, Link2, Trash2, X, Copy, CheckCircle, Edit } from 'lucide-react'
import type { Form, FormField, FormsConfig, FieldType } from './types'
import { loadForms, saveForms, defaultFormsConfig } from './config'

export function FormsWidget({ config = defaultFormsConfig }: { config?: FormsConfig }) {
  const { connectedAccount } = useTypink()
  const [activeTab, setActiveTab] = useState<'create' | 'submissions'>('create')
  const [forms, setForms] = useState<Form[]>([])

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
  const [fieldOptions, setFieldOptions] = useState('')

  // UI state
  const [showLinkCopied, setShowLinkCopied] = useState<string | null>(null)
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null)

  useEffect(() => {
    setForms(loadForms())
  }, [])

  const generateFormId = () => {
    return `form-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  const handleCreateForm = () => {
    if (!formTitle.trim() || !connectedAccount) return

    let updatedForms: Form[]

    if (editingFormId) {
      // Update existing form
      updatedForms = forms.map(f =>
        f.id === editingFormId
          ? {
              ...f,
              title: formTitle.trim(),
              description: formDescription.trim(),
              fields
            }
          : f
      )
    } else {
      // Create new form
      const newForm: Form = {
        id: generateFormId(),
        title: formTitle.trim(),
        description: formDescription.trim(),
        creator: connectedAccount.address,
        createdAt: Date.now(),
        status: 'active',
        fields,
        responses: []
      }
      updatedForms = [newForm, ...forms]
    }

    setForms(updatedForms)
    saveForms(updatedForms)

    // Reset form
    setFormTitle('')
    setFormDescription('')
    setFields([])
    setEditingFormId(null)
    setActiveTab('submissions')
  }

  const handleAddField = () => {
    if (!fieldLabel.trim()) return

    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: fieldType,
      label: fieldLabel.trim(),
      placeholder: fieldPlaceholder.trim() || undefined,
      required: fieldRequired,
      options: fieldType === 'select' ? fieldOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined
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
    setFieldOptions('')
    setShowFieldBuilder(false)
  }

  const handleEditField = (index: number) => {
    const field = fields[index]
    setFieldLabel(field.label)
    setFieldType(field.type)
    setFieldPlaceholder(field.placeholder || '')
    setFieldRequired(field.required)
    setFieldOptions(field.options?.join(', ') || '')
    setEditingFieldIndex(index)
    setShowFieldBuilder(true)
  }

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const handleCopyLink = async (formId: string) => {
    const link = `${window.location.origin}/f/${formId}`
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
          View Submissions ({myForms.length})
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
                    className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent"
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
                    placeholder="Optional description"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:border-transparent resize-none"
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
                      className="flex items-center gap-1 text-xs text-[#ff2867] hover:text-[#e6007a] transition-colors"
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
                              {field.required && <span className="text-[#ff2867] ml-1">*</span>}
                            </div>
                            <div className="text-xs text-[#78716c] mt-0.5">
                              {field.type}
                              {field.placeholder && ` • ${field.placeholder}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditField(index)}
                              className="p-1 text-[#78716c] hover:text-[#1c1917] transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveField(index)}
                              className="p-1 text-[#78716c] hover:text-[#ff2867] transition-colors"
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
                            className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                            Field Type
                          </label>
                          <select
                            value={fieldType}
                            onChange={(e) => setFieldType(e.target.value as FieldType)}
                            className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867]"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="textarea">Textarea</option>
                            <option value="select">Select</option>
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
                            className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867]"
                          />
                        </div>

                        {fieldType === 'select' && (
                          <div>
                            <label className="block text-xs font-medium text-[#1c1917] mb-1.5">
                              Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={fieldOptions}
                              onChange={(e) => setFieldOptions(e.target.value)}
                              placeholder="Option 1, Option 2, Option 3"
                              className="w-full px-3 py-2 text-sm border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff2867]"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="fieldRequired"
                            checked={fieldRequired}
                            onChange={(e) => setFieldRequired(e.target.checked)}
                            className="w-4 h-4 text-[#ff2867] border-[#e7e5e4] rounded focus:ring-[#ff2867]"
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
                            className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-[#E6007A] to-[#552BBF] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {editingFieldIndex !== null ? 'Update' : 'Add'} Field
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create/Update Buttons */}
                <div className="flex gap-2">
                  {editingFormId && (
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-4 py-2.5 text-sm font-medium border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleCreateForm}
                    disabled={!formTitle.trim() || fields.length === 0}
                    className="flex-1 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-[#E6007A] to-[#552BBF] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingFormId ? 'Update Form' : 'Create Form'}
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
                  className="border border-[#e7e5e4] rounded-xl p-4 hover:border-[#ff2867] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1c1917] text-sm">
                        {form.title}
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
                      </div>
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
                    <button
                      onClick={() => setExpandedFormId(expandedFormId === form.id ? null : form.id)}
                      className="flex-1 px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
                    >
                      {expandedFormId === form.id ? 'Hide' : 'View'} Responses
                    </button>
                    <button
                      onClick={() => handleEditForm(form.id)}
                      className="p-1.5 text-[#78716c] hover:text-[#ff2867] transition-colors"
                      title="Edit form"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(form.id)}
                      className="px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
                    >
                      {form.status === 'active' ? 'Close' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="p-1.5 text-[#78716c] hover:text-[#ff2867] transition-colors"
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
                            {form.fields.map((field) => (
                              <div key={field.id}>
                                <div className="text-xs font-medium text-[#1c1917]">
                                  {field.label}:
                                </div>
                                <div className="text-xs text-[#78716c]">
                                  {response.answers[field.id] || <em className="text-[#a8a29e]">No answer</em>}
                                </div>
                              </div>
                            ))}
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
