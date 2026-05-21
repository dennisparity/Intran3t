/**
 * PolkadotSigner for browser-extension and Spektr (Triangle host) mode.
 *
 * Uses PAPI's canonical `getPolkadotSigner` to assemble the signing payload
 * and delegates the actual byte signing to the extension via
 * `signRaw({ type: 'payload' })`. This sidesteps PAPI's PJS adapter which
 * throws on unknown signed-extensions like `AsPgas` (added by pallet_revive).
 *
 * Talisman, SubWallet, polkadot-js, and Spektr all support `signRaw` with
 * `type: 'payload'`.
 *
 * Ported from paritytech/w3s-conference-app.
 */
import { fromHex, toHex } from '@polkadot-api/utils'
import { getPolkadotSigner } from 'polkadot-api/signer'
import type { PolkadotSigner } from 'polkadot-api/signer'

type SigningType = 'Sr25519' | 'Ed25519' | 'Ecdsa'

const SCHEME_BY_KEYPAIR: Record<string, SigningType> = {
  sr25519: 'Sr25519',
  ed25519: 'Ed25519',
  ecdsa: 'Ecdsa',
}

interface InjectedSigner {
  signRaw: (req: {
    address: string
    data: string
    type: 'bytes' | 'payload'
  }) => Promise<{ signature: string }>
}

interface InjectedEntry {
  enable: (origin: string) => Promise<{ signer: InjectedSigner }>
}

export interface CreateStandaloneTxSignerOpts {
  extensionName: string
  dappName: string
  address: string
  publicKey: Uint8Array
  keypairType?: string
}

export function createStandaloneTxSigner(opts: CreateStandaloneTxSignerOpts): PolkadotSigner {
  const { extensionName, dappName, address, publicKey, keypairType = 'sr25519' } = opts
  const scheme = SCHEME_BY_KEYPAIR[keypairType.toLowerCase()] ?? 'Sr25519'

  const sign = async (data: Uint8Array): Promise<Uint8Array> => {
    const entry = (globalThis as { injectedWeb3?: Record<string, InjectedEntry> })
      .injectedWeb3?.[extensionName]
    if (!entry) throw new Error(`Extension "${extensionName}" not available`)
    const ext = await entry.enable(dappName)
    const result = await ext.signer.signRaw({
      address,
      data: toHex(data),
      type: 'payload',
    })
    return fromHex(result.signature)
  }

  return getPolkadotSigner(publicKey, scheme, sign)
}
