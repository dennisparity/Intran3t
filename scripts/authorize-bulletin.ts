/**
 * Authorize Alice to store on Bulletin Chain via Sudo.
 * Run once per testnet. Safe to re-run (idempotent).
 *
 * Usage: npx tsx scripts/authorize-bulletin.ts
 */

import { sr25519CreateDerive } from '@polkadot-labs/hdkd'
import { DEV_PHRASE, entropyToMiniSecret, mnemonicToEntropy, ss58Encode } from '@polkadot-labs/hdkd-helpers'
import { createClient } from 'polkadot-api'
import { getPolkadotSigner } from 'polkadot-api/signer'
import { getWsProvider } from 'polkadot-api/ws-provider/web'
import { bulletin } from '../.papi/descriptors/dist/index.mjs'

const BULLETIN_RPC = 'wss://bulletin.dotspark.app'

function createAliceSigner() {
  const entropy = mnemonicToEntropy(DEV_PHRASE)
  const miniSecret = entropyToMiniSecret(entropy)
  const derive = sr25519CreateDerive(miniSecret)
  const keyPair = derive('//Alice')
  const ss58Address = ss58Encode(keyPair.publicKey, 42)
  const signer = getPolkadotSigner(keyPair.publicKey, 'Sr25519', async (input: Uint8Array) => keyPair.sign(input))
  return { signer, ss58Address }
}

async function main() {
  console.log('Connecting to Bulletin Chain:', BULLETIN_RPC)
  const client = createClient(getWsProvider(BULLETIN_RPC))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = client.getTypedApi(bulletin)

  const { signer, ss58Address } = createAliceSigner()
  console.log('Alice SS58:', ss58Address)
  console.log('Authorizing Alice via Sudo...')

  const sudoTx = api.tx.Sudo.sudo({
    call: {
      type: 'TransactionStorage',
      value: {
        type: 'authorize_account',
        value: {
          who: ss58Address,
          transactions: 4_294_967_295,           // u32::MAX
          bytes: BigInt('18446744073709551615')   // u64::MAX
        }
      }
    }
  })

  try {
    await new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = sudoTx.signSubmitAndWatch(signer).subscribe({
        next: (event: any) => {
          console.log('Event:', event.type)
          if (event.type === 'txBestBlocksState' && event.found) {
            console.log('✓ Alice authorized: u32::MAX txs, u64::MAX bytes')
            sub.unsubscribe()
            resolve()
          }
        },
        error: (e: Error) => { sub.unsubscribe(); reject(e) }
      })
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('AlreadyAuthorized') || msg.includes('Sudid')) {
      console.log('✓ Already authorized')
    } else {
      console.log('Warning:', msg.split('\n')[0])
      console.log('If store fails later, Alice may not be authorized.')
    }
  }

  client.destroy()
  process.exit(0)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
