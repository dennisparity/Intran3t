import {
  uploadRawToBulletin, uploadRawToBulletinWithStatus, uploadRawToBulletinAsUser,
  fetchRawFromBulletin, type BulletinUploadResult
} from '../../lib/bulletin-storage'
import type { PolkadotSigner } from 'polkadot-api'
import type { Deck, DeckIndexEntry, Slide, SlideBlock, SlidesConfig } from './types'

export const SLIDES_INDEX_KEY = 'intran3t_slides'
const DRAFT_PREFIX = 'intran3t_slides_draft:'
const IMAGE_CACHE_PREFIX = 'intran3t_slides_img:'

export const defaultSlidesConfig: SlidesConfig = {
  title: 'Slides',
  description: 'Build and share presentations on Polkadot'
}

// ─── Local index of decks ────────────────────────────────────────────────────

export function loadDecks(): DeckIndexEntry[] {
  try {
    const stored = localStorage.getItem(SLIDES_INDEX_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load decks:', e)
  }
  return []
}

export function saveDecks(decks: DeckIndexEntry[]): void {
  try {
    localStorage.setItem(SLIDES_INDEX_KEY, JSON.stringify(decks))
  } catch (e) {
    console.error('Failed to save decks:', e)
  }
}

export function upsertDeckEntry(entry: DeckIndexEntry): void {
  const decks = loadDecks()
  const idx = decks.findIndex(d => d.localId === entry.localId)
  if (idx >= 0) decks[idx] = entry
  else decks.unshift(entry)
  saveDecks(decks)
}

export function deleteDeckEntry(localId: string): void {
  saveDecks(loadDecks().filter(d => d.localId !== localId))
  try { localStorage.removeItem(DRAFT_PREFIX + localId) } catch { /* ignore */ }
}

// ─── Editable drafts (full Deck, keyed by localId) ───────────────────────────

export function loadDraft(localId: string): Deck | null {
  try {
    const stored = localStorage.getItem(DRAFT_PREFIX + localId)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load draft:', e)
  }
  return null
}

export function saveDraft(localId: string, deck: Deck): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + localId, JSON.stringify(deck))
  } catch (e) {
    console.error('Failed to save draft:', e)
  }
}

// ─── Bulletin deck upload / fetch (JSON around raw helpers) ───────────────────

/**
 * Publish a deck to Bulletin. When a publisher signer + address are supplied,
 * the deck is authorized + stored by that account (individual ownership);
 * otherwise it falls back to the wallet-less //Alice relay.
 */
export async function uploadDeck(
  deck: Deck,
  publisher?: { signer: PolkadotSigner; address: string }
): Promise<BulletinUploadResult> {
  const bytes = new TextEncoder().encode(JSON.stringify(deck))
  if (publisher) return uploadRawToBulletinAsUser(bytes, publisher.signer, publisher.address)
  return uploadRawToBulletinWithStatus(bytes)
}

export async function fetchDeck(cid: string): Promise<Deck> {
  const bytes = await fetchRawFromBulletin(cid)
  return JSON.parse(new TextDecoder().decode(bytes)) as Deck
}

/** Upload raw image bytes to Bulletin, returning the CID. */
export async function uploadImage(bytes: Uint8Array): Promise<string> {
  return uploadRawToBulletin(bytes)
}

// ─── Image cache (base64 data URL keyed by CID) ──────────────────────────────
// Bulletin's localStorage fallback is lossy for binary data and gateway
// propagation can lag right after upload, so we keep our own data-URL cache
// to guarantee images render instantly in the editor and viewer.

export function cacheImage(cid: string, dataUrl: string): void {
  try { localStorage.setItem(IMAGE_CACHE_PREFIX + cid, dataUrl) } catch { /* quota */ }
}

export function getCachedImage(cid: string): string | null {
  try { return localStorage.getItem(IMAGE_CACHE_PREFIX + cid) } catch { return null }
}

// ─── Factories ───────────────────────────────────────────────────────────────

export function newId(): string {
  return crypto.randomUUID()
}

export function newSlide(): Slide {
  return { id: newId(), blocks: [] }
}

/** Move an item within an array, returning a new array. */
export function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const next = [...arr]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function cloneBlock(b: SlideBlock): SlideBlock {
  return { ...b, id: newId(), items: b.items ? [...b.items] : undefined }
}

export function cloneSlide(s: Slide): Slide {
  return { id: newId(), blocks: s.blocks.map(cloneBlock) }
}

export function newDeck(author?: string): Deck {
  const now = Date.now()
  return {
    version: '1',
    title: 'Untitled deck',
    author,
    theme: 'light',
    slides: [
      { id: newId(), blocks: [{ id: newId(), type: 'heading', level: 1, text: 'Untitled deck' }] }
    ],
    createdAt: now,
    updatedAt: now
  }
}
