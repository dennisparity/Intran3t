/**
 * Bulletin Chain storage for dForms.
 *
 * Supports two upload modes:
 * 1. Creator-signed: form creator uploads form definitions using their wallet signer
 * 2. Alice relay: voter responses uploaded via Alice (DEV_PHRASE) — no wallet needed
 *
 * No Sudo.sudo() wrapper needed — Alice is already authorized on the public Bulletin testnet.
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
import { Binary, createClient, type PolkadotSigner } from 'polkadot-api'
import { getPolkadotSigner } from 'polkadot-api/signer'
import { getWsProvider } from 'polkadot-api/ws-provider/web'
import { bulletin } from '../../.papi/descriptors'

const BULLETIN_RPC = 'wss://bulletin.dotspark.app'
const BULLETIN_GATEWAY = 'https://ipfs.dotspark.app/ipfs'

export interface BulletinManifest {
  // Version & type
  version: string           // Manifest version (e.g., "1.0.0")
  type: string             // Always "dform-response"

  // Response metadata
  responseId: string       // Unique response identifier
  formId: string          // Form ID this response belongs to
  timestamp: number       // Unix timestamp (milliseconds)
  timestampFormatted: string // ISO 8601 formatted timestamp

  // Encrypted payload
  ciphertext: string      // Hex-encoded encrypted response data
  nonce: string          // Hex-encoded encryption nonce

  // Optional form metadata (for reference)
  formTitle?: string      // Form title (if available)
  onChainFormId?: number  // On-chain form ID (if registered)
}

// ─── Alice relay signer (DEV_PHRASE is public on testnet) ──────────────────

function getAliceSigner(): PolkadotSigner {
  const entropy = mnemonicToEntropy(DEV_PHRASE)
  const miniSecret = entropyToMiniSecret(entropy)
  const derive = sr25519CreateDerive(miniSecret)
  const keyPair = derive('//Alice')
  return getPolkadotSigner(keyPair.publicKey, 'Sr25519', keyPair.sign)
}

// ─── CID computation: blake2b-256 → CIDv1 raw ─────────────────────────────

function computeCID(data: Uint8Array): CID {
  const hash = blake2b(data, { dkLen: 32 })
  const digest = multihash.create(0xb220 /* blake2b-256 */, hash)
  return CID.createV1(0x55 /* raw */, digest)
}

// ─── Core upload (shared by both modes) ────────────────────────────────────

async function submitToBulletin(data: Uint8Array, signer: PolkadotSigner): Promise<string> {
  const cid = computeCID(data)
  const cidStr = cid.toString()

  const client = createClient(getWsProvider(BULLETIN_RPC))
  try {
    const api = client.getTypedApi(bulletin)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Bulletin store timed out after 60s')), 60_000)

      const storeTx = api.tx.TransactionStorage.store({
        data: Binary.fromBytes(data)
      })

      storeTx.signSubmitAndWatch(signer).subscribe({
        next: (event: { type: string; ok?: boolean }) => {
          console.log('[Bulletin] tx event:', event.type)
          if (event.type === 'finalized') {
            clearTimeout(timeout)
            if (event.ok) {
              resolve()
            } else {
              reject(new Error('Bulletin store transaction failed'))
            }
          }
        },
        error: (err: unknown) => { clearTimeout(timeout); reject(err) }
      })
    })
  } finally {
    client.destroy()
  }

  return cidStr
}

// ─── Upload with creator's wallet signer ───────────────────────────────────

/**
 * Upload raw data to Bulletin Chain using the provided signer (creator's wallet).
 * Returns the CID string.
 */
export async function uploadToBulletinWithSigner(data: Uint8Array, signer: PolkadotSigner): Promise<string> {
  return submitToBulletin(data, signer)
}

// ─── Upload via Alice relay (for voter submissions) ────────────────────────

/**
 * Upload an encrypted form response manifest to Bulletin Chain.
 * Alice relay key signs the transaction. Returns the CID string.
 */
export async function uploadToBulletin(manifest: BulletinManifest): Promise<string> {
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest))
  return submitToBulletin(manifestBytes, getAliceSigner())
}

/**
 * Upload raw bytes via Alice relay. Returns CID string.
 */
export async function uploadRawToBulletin(data: Uint8Array): Promise<string> {
  return submitToBulletin(data, getAliceSigner())
}

// ─── Fetch ─────────────────────────────────────────────────────────────────

/**
 * Fetch raw bytes from Bulletin via gateway.
 */
export async function fetchRawFromBulletin(cid: string): Promise<Uint8Array> {
  const res = await fetch(`${BULLETIN_GATEWAY}/${cid}`, {
    signal: AbortSignal.timeout(15_000)
  })
  if (!res.ok) throw new Error(`Bulletin gateway error: ${res.status} for CID ${cid}`)
  return new Uint8Array(await res.arrayBuffer())
}

/**
 * Fetch an encrypted form response manifest from Bulletin via gateway.
 */
export async function fetchFromBulletin(cid: string): Promise<BulletinManifest> {
  const bytes = await fetchRawFromBulletin(cid)
  return JSON.parse(new TextDecoder().decode(bytes)) as BulletinManifest
}
