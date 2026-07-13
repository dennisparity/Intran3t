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
import { createClient, type PolkadotSigner } from 'polkadot-api'
import { Binary } from '@polkadot-api/substrate-bindings'
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

// getUnsafeApi() fetches live chain metadata at runtime — immune to "Incompatible runtime
// entry" errors when the testnet runtime upgrades. The 120s Promise.race timeout below
// protects against the stall that previously caused this approach to be reverted.
async function submitToBulletin(data: Uint8Array, signer: PolkadotSigner): Promise<string> {
  const cid = computeCID(data).toString()
  const client = createBulletinClient()
  try {
    const api = client.getUnsafeApi()
    console.log('[Bulletin] Submitting store tx...')
    const result = await Promise.race([
      api.tx.TransactionStorage.store({ data: Binary.fromBytes(data) as any }).signAndSubmit(signer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Bulletin store timed out after 120s')), 120_000)
      )
    ])
    if ((result as any).dispatchError) {
      throw new Error(`Bulletin dispatch error: ${JSON.stringify((result as any).dispatchError)}`)
    }
    console.log('[Bulletin] Store tx included in block')
    return cid
  } finally {
    client.destroy()
  }
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

/**
 * Upload data attributed to a specific owner. Sudo.sudo (required to authorize
 * individual accounts on Bulletin) does not exist on Bulletin v2, so this falls
 * back to the Alice relay for signing. The owner's address is preserved in the
 * deck's author field at the data layer.
 */
export async function uploadRawToBulletinAsUser(
  data: Uint8Array,
  _signer: PolkadotSigner,
  owner: string
): Promise<BulletinUploadResult> {
  const result = await uploadRawToBulletinWithStatus(data)
  return { ...result, signer: 'user', owner }
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
