/**
 * Form encryption key management.
 *
 * Generates a random AES-256-GCM key per form, stored in localStorage.
 * The key is also embedded in shareable links so voters can encrypt responses.
 */

const KEY_PREFIX = 'dforms:key:'

/** URL-safe base64 encode */
export function toBase64url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** URL-safe base64 decode */
export function fromBase64url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const decoded = atob(base64 + padding)
  return new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)))
}

/** Generate a random 32-byte AES-256 key for a new form */
export function generateFormKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

/** Persist form key to localStorage (creator's device only) */
export function saveFormKey(formId: string, key: Uint8Array): void {
  localStorage.setItem(KEY_PREFIX + formId, toBase64url(key))
}

/** Load form key from localStorage — returns null if not found */
export function getFormKey(formId: string): Uint8Array | null {
  const stored = localStorage.getItem(KEY_PREFIX + formId)
  if (!stored) return null
  try {
    return fromBase64url(stored)
  } catch {
    return null
  }
}

/** Remove form key from localStorage */
export function deleteFormKey(formId: string): void {
  localStorage.removeItem(KEY_PREFIX + formId)
}
