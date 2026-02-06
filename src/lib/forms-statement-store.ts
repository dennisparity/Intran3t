/**
 * Forms Statement Store Service
 *
 * Handles decentralized storage of forms and responses using Polkadot's statement store.
 * - Forms are published on-chain by creators
 * - Responses are submitted on-chain by responders
 * - 2-week auto-delete for privacy (ephemeral storage)
 */

import { StatementStore } from './ss-webrtc/StatementStore'
import type {
  FormSchemaValue,
  FormResponseValue,
  LogType
} from './ss-webrtc/types'
import {
  getFormSchemaChannel,
  getFormResponseChannel,
  generateResponseId,
  generateFormId
} from './ss-webrtc/types'

export interface FormSubmissionData {
  formId: string
  title: string
  description: string
  fields: Array<{
    id: string
    type: 'text' | 'email' | 'select' | 'multiselect'
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
  }>
}

export interface ResponseSubmissionData {
  formId: string
  answers: Record<string, string | string[]>
}

/**
 * Forms Statement Store Manager
 * Manages connection and operations for form storage
 */
export class FormsStatementStore {
  private store: StatementStore | null = null
  private endpoint: string
  private onLog: (message: string, type: LogType) => void

  constructor(
    endpoint: string,
    onLog?: (message: string, type: LogType) => void
  ) {
    this.endpoint = endpoint
    this.onLog = onLog || ((msg, type) => console.log(`[${type}]`, msg))
  }

  /**
   * Connect to statement store with wallet
   */
  async connect(mnemonic: string, documentId: string): Promise<void> {
    if (this.store?.isConnected()) {
      return
    }

    this.store = new StatementStore({
      endpoint: this.endpoint,
      documentId,
      mnemonic,
      onLog: this.onLog
    })

    await this.store.connect()
  }

  /**
   * Disconnect from statement store
   */
  disconnect(): void {
    if (this.store) {
      this.store.disconnect()
      this.store = null
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.store?.isConnected() ?? false
  }

  /**
   * Publish a form schema to statement store
   * Called by form creators
   */
  async publishForm(
    data: FormSubmissionData,
    creatorAddress: string
  ): Promise<string> {
    if (!this.store) {
      throw new Error('Not connected to statement store')
    }

    const formId = data.formId || generateFormId()
    const timestamp = Date.now()

    const formValue: FormSchemaValue = {
      type: 'form-schema',
      formId,
      title: data.title,
      description: data.description,
      creator: creatorAddress,
      createdAt: timestamp,
      status: 'active',
      fields: data.fields,
      timestamp
    }

    const channel = getFormSchemaChannel(formId)
    const success = await this.store.write(channel, formValue)

    if (!success) {
      throw new Error('Failed to publish form to statement store')
    }

    return formId
  }

  /**
   * Submit a form response to statement store
   * Called by form responders
   */
  async submitResponse(
    data: ResponseSubmissionData,
    responderAddress: string
  ): Promise<string> {
    if (!this.store) {
      throw new Error('Not connected to statement store')
    }

    const responseId = generateResponseId()
    const timestamp = Date.now()

    const responseValue: FormResponseValue = {
      type: 'form-response',
      responseId,
      formId: data.formId,
      responderAddress,
      submittedAt: timestamp,
      answers: data.answers,
      timestamp
    }

    const channel = getFormResponseChannel(data.formId, responseId)
    const success = await this.store.write(channel, responseValue)

    if (!success) {
      throw new Error('Failed to submit response to statement store')
    }

    return responseId
  }

  /**
   * Read form schema from statement store
   */
  async readFormSchema(formId: string): Promise<FormSchemaValue | null> {
    if (!this.store) {
      throw new Error('Not connected to statement store')
    }

    const result = await this.store.readFormSchema(formId)

    if (!result || result.type !== 'form-schema') {
      return null
    }

    return result as FormSchemaValue
  }

  /**
   * Read all responses for a form
   * Only the form creator should call this
   */
  async readFormResponses(formId: string): Promise<FormResponseValue[]> {
    if (!this.store) {
      throw new Error('Not connected to statement store')
    }

    const results = await this.store.readFormResponses(formId)
    const responses: FormResponseValue[] = []

    for (const [, value] of results.entries()) {
      if (value.type === 'form-response') {
        responses.push(value as FormResponseValue)
      }
    }

    // Sort by submission time (newest first)
    responses.sort((a, b) => b.submittedAt - a.submittedAt)

    return responses
  }

  /**
   * Update form status (active/closed)
   * Only the form creator can do this
   */
  async updateFormStatus(
    formId: string,
    status: 'active' | 'closed',
    creatorAddress: string
  ): Promise<void> {
    if (!this.store) {
      throw new Error('Not connected to statement store')
    }

    // Read existing form
    const existingForm = await this.readFormSchema(formId)
    if (!existingForm) {
      throw new Error('Form not found')
    }

    // Verify creator
    if (existingForm.creator !== creatorAddress) {
      throw new Error('Only the form creator can update status')
    }

    // Update status
    const updatedForm: FormSchemaValue = {
      ...existingForm,
      status,
      timestamp: Date.now()
    }

    const channel = getFormSchemaChannel(formId)
    const success = await this.store.write(channel, updatedForm)

    if (!success) {
      throw new Error('Failed to update form status')
    }
  }
}

/**
 * Create a statement store instance for forms
 */
export function createFormsStatementStore(
  endpoint?: string,
  onLog?: (message: string, type: LogType) => void
): FormsStatementStore {
  const wsEndpoint = endpoint || import.meta.env.VITE_SUBSTRATE_ENDPOINT || 'wss://pop-testnet.parity-lab.parity.io:443/9910'
  return new FormsStatementStore(wsEndpoint, onLog)
}
