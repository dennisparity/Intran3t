export type FormStatus = 'active' | 'closed'
export type FieldType = 'text' | 'email' | 'select' | 'multiselect'

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  options?: string[] // For select fields
}

export interface FormResponse {
  id: string
  formId: string
  submittedAt: number
  answers: Record<string, string | string[]>
}

export interface Form {
  id: string
  title: string
  description: string
  creator: string // Wallet address
  createdAt: number
  status: FormStatus
  fields: FormField[]
  responses: FormResponse[]
}

export interface FormsConfig {
  title?: string
  description?: string
  allowFormCreation?: boolean
  maxFieldsPerForm?: number
}
