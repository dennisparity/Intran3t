/**
 * Statement Store Types for dForms
 *
 * Adapted from ss-webrtc for form storage
 */

export type LogType = 'info' | 'success' | 'error' | 'warning' | 'blockchain'

export interface LogEntry {
  timestamp: Date
  message: string
  type: LogType
}

/**
 * Channel namespace structure:
 * {formId}/
 * ├── form-schema              # Form definition (title, description, fields)
 * └── response-{responseId}    # Individual form responses
 */

export type ChannelType = 'form-schema' | 'form-response'

/**
 * Form schema value - written by form creator
 */
export interface FormSchemaValue {
  type: 'form-schema'
  formId: string
  title: string
  description: string
  creator: string  // Wallet address
  createdAt: number
  status: 'active' | 'closed'
  fields: Array<{
    id: string
    type: 'text' | 'email' | 'select' | 'multiselect'
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
  }>
  timestamp: number
}

/**
 * Form response value - written by form responder
 */
export interface FormResponseValue {
  type: 'form-response'
  responseId: string
  formId: string
  responderAddress: string  // Auto-generated wallet address
  submittedAt: number
  answers: Record<string, string | string[]>
  timestamp: number
  // Optional encrypted payload (for privacy)
  encrypted?: boolean
  encryptedData?: string
}

export type ChannelValue = FormSchemaValue | FormResponseValue

// ============================================================================
// Channel Naming Functions
// ============================================================================

/**
 * Generate form schema channel name
 */
export function getFormSchemaChannel(formId: string): string {
  return `${formId}/form-schema`
}

/**
 * Generate form response channel name
 */
export function getFormResponseChannel(formId: string, responseId: string): string {
  return `${formId}/response-${responseId}`
}

/**
 * Generate a random response ID
 */
export function generateResponseId(): string {
  return `response-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Generate a random form ID
 */
export function generateFormId(): string {
  return `form-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
