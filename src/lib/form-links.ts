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
 * Create a shareable link. Embeds only the encryption key as a hash fragment
 * (form definition is loaded from Bulletin via contract).
 *
 * Short format: /#/f/{formId}#key={base64url}
 *
 * The key is in the fragment (after #) so it's never sent to the server.
 */
export function createFormLink(
  formDef: Form,
  formKey: Uint8Array,
  baseUrl: string = window.location.origin
): ShareableFormLink {
  const keyEncoded = toBase64url(formKey)
  // Short link: only form ID + key, form def loaded from Bulletin
  const url = `${baseUrl}/#/f/${formDef.id}#key=${keyEncoded}`

  return { formId: formDef.id, formKey, formDef, url }
}

/**
 * Extract the encryption key from the current URL's hash fragment.
 * Format: /#/f/{formId}#key={base64url}
 * Returns null if not present or invalid.
 */
export function getKeyFromCurrentURL(): Uint8Array | null {
  const hash = window.location.hash // e.g. "#/f/123#key=..."
  const keyMatch = hash.match(/#key=([^&]+)/)
  if (!keyMatch) return null

  try {
    return fromBase64url(keyMatch[1])
  } catch {
    return null
  }
}

/**
 * Remove key from the hash fragment for security.
 * Called after extracting the key so it doesn't persist in browser history.
 * e.g. "#/f/123#key=..." → "#/f/123"
 */
export function clearKeyFromURL(): void {
  const hash = window.location.hash
  const keyIndex = hash.indexOf('#key=')
  if (keyIndex === -1) return
  const pathPart = hash.substring(0, keyIndex) // "#/f/123"
  window.history.replaceState(null, '', window.location.pathname + pathPart)
}
