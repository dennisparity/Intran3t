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

export interface EncryptedResponse {
  id: string
  formId: string
  submittedAt: number
  ciphertext: string  // hex-encoded
  nonce: string       // hex-encoded
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
  // Encryption (added for dForms)
  encryptionKey?: string  // base64url-encoded AES-256-GCM key (creator stores on their device)
  // Aggregate stats for select/multiselect fields: { fieldId: { optionValue: count } }
  aggregates?: Record<string, Record<string, number>>
  // On-chain metadata (added for PolkaVM contract integration)
  onChainId?: string  // On-chain form ID from contract
  onChainTimestamp?: number  // When registered on-chain (timestamp)
  signerAddress?: string  // Substrate address that signed the transaction
  bulletinCid?: string  // CID of form definition stored on Bulletin chain
}

export interface FormsConfig {
  title?: string
  description?: string
  allowFormCreation?: boolean
  maxFieldsPerForm?: number
}
