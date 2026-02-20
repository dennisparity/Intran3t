import type { Form, FormResponse, FormsConfig, EncryptedResponse } from './types'

export const FORMS_STORAGE_KEY = 'intran3t_forms'
export const RESPONSES_STORAGE_KEY = 'intran3t_form_responses'
export const ENCRYPTED_RESPONSES_PREFIX = 'dforms:encrypted:'

export function loadForms(): Form[] {
  try {
    const stored = localStorage.getItem(FORMS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load forms:', e)
  }
  return []
}

export function saveForms(forms: Form[]) {
  try {
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(forms))
  } catch (e) {
    console.error('Failed to save forms:', e)
  }
}

export function loadResponses(): FormResponse[] {
  try {
    const stored = localStorage.getItem(RESPONSES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load responses:', e)
  }
  return []
}

export function saveResponse(response: FormResponse) {
  try {
    const responses = loadResponses()
    responses.push(response)
    localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(responses))
  } catch (e) {
    console.error('Failed to save response:', e)
  }
}

export function loadEncryptedResponses(formId: string): EncryptedResponse[] {
  try {
    const stored = localStorage.getItem(ENCRYPTED_RESPONSES_PREFIX + formId)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load encrypted responses:', e)
  }
  return []
}

export function saveEncryptedResponse(response: EncryptedResponse): void {
  try {
    const responses = loadEncryptedResponses(response.formId)
    responses.push(response)
    localStorage.setItem(ENCRYPTED_RESPONSES_PREFIX + response.formId, JSON.stringify(responses))
  } catch (e) {
    console.error('Failed to save encrypted response:', e)
  }
}

export const defaultFormsConfig: FormsConfig = {
  title: 'Forms',
  description: 'Create forms and collect responses',
  allowFormCreation: true,
  maxFieldsPerForm: 20
}
