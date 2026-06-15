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
import { createPapiProvider } from '@novasamatech/host-api-wrapper'
import { isInHost } from './wallet-provider'

const BULLETIN_RPC = 'wss://paseo-bulletin-next-rpc.polkadot.io'
// Required so Triangle host routes to Bulletin chain instead of falling back to Asset Hub.
const BULLETIN_GENESIS = '0x8cfe6717dc4becfda2e13c488a1e2061ff2dfee96e7d031157f72d36716c0a22'
const BULLETIN_GATEWAY = 'https://paseo-bulletin-next-ipfs.polkadot.io/ipfs'
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

function createBulletinClient() {
  const wsProvider = getWsProvider(BULLETIN_RPC)
  const provider = isInHost()
    ? createPapiProvider(BULLETIN_GENESIS as `0x${string}`, wsProvider)
    : wsProvider
  return createClient(provider)
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}

async function submitToBulletin(data: Uint8Array, signer: PolkadotSigner): Promise<string> {
  const cid = computeCID(data)
  const cidStr = cid.toString()

  const client = createBulletinClient()
  try {
    const api = client.getUnsafeApi() as any

    await new Promise<void>((resolve, reject) => {
      let sub: { unsubscribe: () => void } | undefined
      const timeout = setTimeout(() => {
        sub?.unsubscribe()
        reject(new Error('Bulletin store timed out after 180s'))
      }, 180_000)

      sub = api.tx.TransactionStorage.store({ data: Binary.fromHex(bytesToHex(data)) })
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
  return (await uploadRawToBulletinWithStatus(data)).cid
}

export interface BulletinUploadResult {
  cid: string
  /** true if the TransactionStorage.store extrinsic landed in a block; false if it fell back to localStorage. */
  onChain: boolean
  /** Who signed the store extrinsic: the wallet-less relay, or the publisher's own account. */
  signer: 'relay-alice' | 'user'
  /** SS58 address that owns the stored data (set when signer === 'user'). */
  owner?: string
}

/**
 * Same as uploadRawToBulletin but reports whether the data actually went on-chain
 * or fell back to localStorage, so callers can be honest about state.
 */
export async function uploadRawToBulletinWithStatus(data: Uint8Array): Promise<BulletinUploadResult> {
  const cid = computeCID(data).toString()
  try {
    const onChainCid = await submitToBulletin(data, getAliceSigner())
    lsPut(onChainCid, new TextDecoder().decode(data))
    return { cid: onChainCid, onChain: true, signer: 'relay-alice' }
  } catch (err) {
    console.warn('[Bulletin] Chain upload failed, falling back to localStorage:', err)
    lsPut(cid, new TextDecoder().decode(data))
    return { cid, onChain: false, signer: 'relay-alice' }
  }
}

// ─── Publisher-signed upload (authorize-then-store) ──────────────────────────
//
// Bulletin storage is permissioned: TransactionStorage.store only succeeds for
// accounts the chain has authorized via TransactionStorage.authorize_account,
// which itself requires Sudo. So to let an individual publish & own their deck,
// we (1) have the //Alice sudo relay authorize the publisher's account, then
// (2) the publisher's own account signs the store extrinsic.
//
// UPGRADE PATH (post-prototype): once live, users should be authorized by
// default (e.g. the host/product grants storage allowance on first use, or the
// chain allows permissionless store with a deposit). At that point the sudo
// authorize step below is removed and the publisher simply signs the store.

/** Authorize an account to store on Bulletin, via the //Alice sudo relay. Idempotent. */
async function authorizeAccountViaSudo(address: string): Promise<void> {
  const client = createBulletinClient()
  try {
    const api = client.getUnsafeApi() as any
    await new Promise<void>((resolve, reject) => {
      let sub: { unsubscribe: () => void } | undefined
      const timeout = setTimeout(() => {
        sub?.unsubscribe()
        reject(new Error('Bulletin authorize timed out after 120s'))
      }, 120_000)

      sub = api.tx.Sudo.sudo({
        call: {
          type: 'TransactionStorage',
          value: {
            type: 'authorize_account',
            value: { who: address, transactions: 4_294_967_295, bytes: 18_446_744_073_709_551_615n }
          }
        }
      })
        .signSubmitAndWatch(getAliceSigner())
        .subscribe({
          next: (event: { type: string; found?: boolean }) => {
            // The outer sudo extrinsic landing in a block means authorization is
            // applied (AlreadyAuthorized inner errors are harmless — still authorized).
            if (event.type === 'txBestBlocksState' && event.found) {
              clearTimeout(timeout); sub?.unsubscribe(); resolve()
            } else if (event.type === 'invalid') {
              clearTimeout(timeout); sub?.unsubscribe(); reject(new Error('Bulletin authorize invalid'))
            }
          },
          error: (err: unknown) => { clearTimeout(timeout); sub?.unsubscribe(); reject(err) }
        })
    })
  } finally {
    client.destroy()
  }
}

/**
 * Authorize the publisher's account (via sudo relay), then store the data signed
 * by that same account so the individual owns it on-chain. Falls back to
 * localStorage if either step fails, reporting honest status.
 */
export async function uploadRawToBulletinAsUser(
  data: Uint8Array,
  signer: PolkadotSigner,
  owner: string
): Promise<BulletinUploadResult> {
  const cid = computeCID(data).toString()
  try {
    await authorizeAccountViaSudo(owner)
    const onChainCid = await submitToBulletin(data, signer)
    lsPut(onChainCid, new TextDecoder().decode(data))
    return { cid: onChainCid, onChain: true, signer: 'user', owner }
  } catch (err) {
    console.warn('[Bulletin] Publisher-signed upload failed, falling back to localStorage:', err)
    lsPut(cid, new TextDecoder().decode(data))
    return { cid, onChain: false, signer: 'user', owner }
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
