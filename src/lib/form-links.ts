/**
 * Shareable form link helpers.
 *
 * The app uses HashRouter, so the URL format is:
 *
 *   https://intran3t-app42.paseo.li/#/f/{formId}?key={base64url}&def={base64url}
 *
 * The query params sit inside the hash fragment (#/f/...) so they are never
 * sent to the server — same privacy property as a plain URL fragment.
 *
 * Inspired by Skiff's shareable link approach.
 */

import type { Form } from '../modules/forms/types'
import { toBase64url, fromBase64url } from './form-keys'

export interface ShareableFormLink {
  formId: string
  formKey: Uint8Array
  formDef: Form
  url: string
}

/**
 * Create a shareable link. Embeds form definition and encryption key as
 * query params inside the hash (HashRouter-compatible, server-private).
 */
export function createFormLink(
  formDef: Form,
  formKey: Uint8Array,
  baseUrl: string = window.location.origin
): ShareableFormLink {
  const keyEncoded = toBase64url(formKey)
  const defJson = JSON.stringify(formDef)
  const defEncoded = toBase64url(new TextEncoder().encode(defJson))
  const url = `${baseUrl}/#/f/${formDef.id}?key=${keyEncoded}&def=${defEncoded}`

  return { formId: formDef.id, formKey, formDef, url }
}

/** Extract search params from inside the hash (e.g. "#/f/123?key=...&def=...") */
function getHashSearchParams(): URLSearchParams {
  const hash = window.location.hash // "#/f/123?key=...&def=..."
  const qIndex = hash.indexOf('?')
  if (qIndex === -1) return new URLSearchParams()
  return new URLSearchParams(hash.substring(qIndex + 1))
}

/**
 * Extract the encryption key from the current URL's hash query params.
 * Returns null if not present or invalid.
 */
export function getKeyFromCurrentURL(): Uint8Array | null {
  const params = getHashSearchParams()
  const keyBase64 = params.get('key')
  if (!keyBase64) return null

  try {
    return fromBase64url(keyBase64)
  } catch {
    return null
  }
}

/**
 * Extract the form definition from the current URL's hash query params.
 * Returns null if not present or invalid.
 */
export function getFormDefFromCurrentURL(): Form | null {
  const params = getHashSearchParams()
  const defBase64 = params.get('def')
  if (!defBase64) return null

  try {
    const json = new TextDecoder().decode(fromBase64url(defBase64))
    return JSON.parse(json) as Form
  } catch {
    return null
  }
}

/**
 * Remove key and def query params from the hash for security.
 * Called after extracting the key so it doesn't persist in browser history.
 * e.g. "#/f/123?key=...&def=..." → "#/f/123"
 */
export function clearKeyFromURL(): void {
  const hash = window.location.hash
  const qIndex = hash.indexOf('?')
  if (qIndex === -1) return
  const pathPart = hash.substring(0, qIndex) // "#/f/123"
  window.history.replaceState(null, '', window.location.pathname + pathPart)
}
