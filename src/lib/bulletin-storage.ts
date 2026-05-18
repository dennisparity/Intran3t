/**
 * Bulletin Chain storage for dForms.
 *
 * Upload modes:
 * 1. Creator-signed: form creator uploads form definitions using their wallet signer
 * 2. Alice relay: voter responses uploaded via Alice (DEV_PHRASE) — no wallet needed
 *
 * Falls back to localStorage on any chain failure so the UI always works.
 */

import { blake2b } from '@noble/hashes/blake2.js'
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy
} from '@polkadot-labs/hdkd-helpers'
import { sr25519CreateDerive } from '@polkadot-labs/hdkd'
import { CID } from 'multiformats/cid'
import * as multihash from 'multiformats/hashes/digest'
import { createClient, Binary, type PolkadotSigner } from 'polkadot-api'
import { getPolkadotSigner } from 'polkadot-api/signer'
import { getWsProvider } from 'polkadot-api/ws'

const BULLETIN_RPC = 'wss://paseo-bulletin-rpc.polkadot.io'
const BULLETIN_GATEWAY = 'https://paseo-ipfs.polkadot.io/ipfs'
const LS_PREFIX = 'intran3t.bulletin.'

export interface BulletinManifest {
  version: string
  type: string
  responseId: string
  formId: string
  timestamp: number
  timestampFormatted: string
  ciphertext: string
  nonce: string
  formTitle?: string
  onChainFormId?: number
}

// ─── CID computation: blake2b-256 → CIDv1 raw ─────────────────────────────

function computeCID(data: Uint8Array): CID {
  const hash = blake2b(data, { dkLen: 32 })
  const digest = multihash.create(0xb220 /* blake2b-256 */, hash)
  return CID.createV1(0x55 /* raw */, digest)
}

// ─── localStorage helpers ──────────────────────────────────────────────────

function lsGet(cid: string): string | null {
  try { return localStorage.getItem(LS_PREFIX + cid) } catch { return null }
}

function lsPut(cid: string, json: string): void {
  try { localStorage.setItem(LS_PREFIX + cid, json) } catch { /* ignore */ }
}

// ─── Alice relay signer ────────────────────────────────────────────────────

function getAliceSigner(): PolkadotSigner {
  const entropy = mnemonicToEntropy(DEV_PHRASE)
  const miniSecret = entropyToMiniSecret(entropy)
  const derive = sr25519CreateDerive(miniSecret)
  const keyPair = derive('//Alice')
  return getPolkadotSigner(keyPair.publicKey, 'Sr25519', keyPair.sign)
}

// ─── Core on-chain upload ──────────────────────────────────────────────────

// Binary re-exported from polkadot-api is the class version at runtime, but
// TypeScript resolves it from an older nested dependency without fromBytes.
const BinaryClass = Binary as unknown as { fromBytes(d: Uint8Array): unknown }

async function submitToBulletin(data: Uint8Array, signer: PolkadotSigner): Promise<string> {
  const cid = computeCID(data)
  const cidStr = cid.toString()

  const client = createClient(getWsProvider(BULLETIN_RPC))
  try {
    const api = client.getUnsafeApi() as any

    await new Promise<void>((resolve, reject) => {
      let sub: { unsubscribe: () => void } | undefined
      const timeout = setTimeout(() => {
        sub?.unsubscribe()
        reject(new Error('Bulletin store timed out after 180s'))
      }, 180_000)

      sub = api.tx.TransactionStorage.store({ data: BinaryClass.fromBytes(data) })
        .signSubmitAndWatch(signer)
        .subscribe({
          next: (event: { type: string; found?: boolean }) => {
            console.log('[Bulletin] tx event:', event.type)
            if (event.type === 'txBestBlocksState' && event.found) {
              clearTimeout(timeout)
              sub?.unsubscribe()
              console.log('[Bulletin] Transaction in best block')
              resolve()
            } else if (event.type === 'invalid') {
              clearTimeout(timeout)
              sub?.unsubscribe()
              reject(new Error('Bulletin transaction invalid'))
            }
          },
          error: (err: unknown) => {
            clearTimeout(timeout)
            sub?.unsubscribe()
            reject(err)
          }
        })
    })
  } finally {
    client.destroy()
  }

  return cidStr
}

// ─── Upload with creator's wallet signer ───────────────────────────────────

export async function uploadToBulletinWithSigner(data: Uint8Array, signer: PolkadotSigner): Promise<string> {
  const cid = computeCID(data).toString()
  try {
    const onChainCid = await submitToBulletin(data, signer)
    lsPut(onChainCid, new TextDecoder().decode(data))
    return onChainCid
  } catch (err) {
    console.warn('[Bulletin] Chain upload failed, falling back to localStorage:', err)
    lsPut(cid, new TextDecoder().decode(data))
    return cid
  }
}

// ─── Upload via Alice relay (for voter submissions) ────────────────────────

export async function uploadToBulletin(manifest: BulletinManifest): Promise<string> {
  const json = JSON.stringify(manifest)
  const bytes = new TextEncoder().encode(json)
  const cid = computeCID(bytes).toString()
  try {
    const onChainCid = await submitToBulletin(bytes, getAliceSigner())
    lsPut(onChainCid, json)
    return onChainCid
  } catch (err) {
    console.warn('[Bulletin] Chain upload failed, falling back to localStorage:', err)
    lsPut(cid, json)
    return cid
  }
}

export async function uploadRawToBulletin(data: Uint8Array): Promise<string> {
  const cid = computeCID(data).toString()
  try {
    const onChainCid = await submitToBulletin(data, getAliceSigner())
    lsPut(onChainCid, new TextDecoder().decode(data))
    return onChainCid
  } catch (err) {
    console.warn('[Bulletin] Chain upload failed, falling back to localStorage:', err)
    lsPut(cid, new TextDecoder().decode(data))
    return cid
  }
}

// ─── Fetch ─────────────────────────────────────────────────────────────────

export async function fetchRawFromBulletin(cid: string): Promise<Uint8Array> {
  // Try IPFS gateway first
  try {
    const res = await fetch(`${BULLETIN_GATEWAY}/${cid}`, {
      signal: AbortSignal.timeout(15_000)
    })
    if (res.ok) return new Uint8Array(await res.arrayBuffer())
  } catch { /* fall through */ }

  // Fall back to localStorage
  const cached = lsGet(cid)
  if (cached) return new TextEncoder().encode(cached)

  throw new Error(`Content not found for CID ${cid}`)
}

export async function fetchFromBulletin(cid: string): Promise<BulletinManifest> {
  const bytes = await fetchRawFromBulletin(cid)
  return JSON.parse(new TextDecoder().decode(bytes)) as BulletinManifest
}
