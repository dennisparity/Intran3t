import type { ApiPromise } from '@polkadot/api'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { web3Enable, web3FromSource } from '@polkadot/extension-dapp'
import { getPeopleChainApi } from './identity-helpers'

/**
 * Form data structure for identity fields
 */
export interface IdentityFormData {
  display: string  // Required
  legal?: string
  email?: string
  web?: string
  twitter?: string
  matrix?: string
  github?: string
  discord?: string
}

/**
 * Registrar information from People Chain
 */
export interface RegistrarInfo {
  index: number
  account: string
  fee: bigint
  fields: number  // Bitfield of supported fields
}

/**
 * Deposit calculation result
 */
export interface DepositInfo {
  basic: bigint
  field: bigint
  registrar: bigint
  total: bigint
}

/**
 * Transaction result
 */
export interface TransactionResult {
  success: boolean
  hash?: string
  error?: string
}

/**
 * Helper to encode field - wraps in Raw but lets API handle bytes
 */
export function encodeIdentityField(value: string | undefined) {
  if (!value || value.trim() === '') {
    return { None: undefined }
  }
  // API will convert string to bytes
  return { Raw: value.trim() }
}

// Alias for internal use
const encodeField = encodeIdentityField

/**
 * Build complete identity info object for setIdentity transaction
 * Maps form data to People Chain identity structure
 */
export function buildIdentityInfo(formData: IdentityFormData): any {
  const info: any = {
    display: encodeField(formData.display),
    legal: encodeField(formData.legal),
    web: encodeField(formData.web),
    riot: encodeField(formData.matrix),  // Legacy field for Matrix
    email: encodeField(formData.email),
    twitter: encodeField(formData.twitter),
    image: { None: undefined },
    pgpFingerprint: null,
    additional: []
  }

  // Add github to additional fields if provided
  if (formData.github) {
    info.additional.push([encodeField('github'), encodeField(formData.github)])
  }

  // Add discord to additional fields if provided
  if (formData.discord) {
    info.additional.push([encodeField('discord'), encodeField(formData.discord)])
  }

  return info
}

/**
 * Query available registrars from People Chain
 */
export async function queryRegistrars(api?: ApiPromise): Promise<RegistrarInfo[]> {
  try {
    const peopleApi = api || await getPeopleChainApi()

    console.log('📋 Querying registrars from People Chain...')
    const registrars = await peopleApi.query.identity.registrars()

    console.log('Raw registrars:', registrars.toJSON())

    // Parse registrars
    const registrarList: RegistrarInfo[] = registrars
      .map((opt, index) => {
        if (opt.isNone) return null

        const reg = opt.unwrap()
        console.log(`Registrar ${index}:`, reg.toJSON())

        return {
          index,
          account: reg.account.toString(),
          fee: reg.fee.toBigInt(),
          fields: reg.fields.toNumber()
        }
      })
      .filter((r): r is RegistrarInfo => r !== null)

    console.log(`✅ Found ${registrarList.length} registrars`)
    return registrarList

  } catch (error) {
    console.error('❌ Error querying registrars:', error)
    throw new Error(`Failed to query registrars: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate deposits required for setting identity
 */
export async function calculateDeposits(
  api: ApiPromise | undefined,
  numFields: number,
  registrarFee: bigint
): Promise<DepositInfo> {
  try {
    const peopleApi = api || await getPeopleChainApi()

    console.log('💰 Checking identity pallet constants...')
    console.log('Available constants:', Object.keys(peopleApi.consts.identity || {}))

    // Query deposit constants from chain
    // Note: Some chains might not have these constants or they might be named differently
    let basicDeposit: bigint
    let fieldDeposit: bigint

    // Try to get basicDeposit
    if (peopleApi.consts.identity.basicDeposit) {
      basicDeposit = peopleApi.consts.identity.basicDeposit.toBigInt()
    } else if (peopleApi.consts.identity.subAccountDeposit) {
      // Fallback: some chains use subAccountDeposit
      basicDeposit = peopleApi.consts.identity.subAccountDeposit.toBigInt()
    } else {
      // Default fallback: 20 DOT (typical Polkadot value)
      console.warn('⚠️ basicDeposit constant not found, using default: 20 DOT')
      basicDeposit = BigInt(20_0000000000) // 20 DOT in plancks
    }

    // Try to get fieldDeposit
    if (peopleApi.consts.identity.fieldDeposit) {
      fieldDeposit = peopleApi.consts.identity.fieldDeposit.toBigInt()
    } else {
      // Default fallback: 0.66 DOT per field (typical Polkadot value)
      console.warn('⚠️ fieldDeposit constant not found, using default: 0.66 DOT')
      fieldDeposit = BigInt(66_00000000) // 0.66 DOT in plancks
    }

    // Calculate total
    const total = basicDeposit + (BigInt(numFields) * fieldDeposit) + registrarFee

    console.log('💰 Deposit calculation:')
    console.log(`  Basic deposit: ${basicDeposit} (${Number(basicDeposit) / 1e10} DOT)`)
    console.log(`  Field deposit: ${fieldDeposit} × ${numFields} = ${BigInt(numFields) * fieldDeposit} (${Number(fieldDeposit) / 1e10} DOT per field)`)
    console.log(`  Registrar fee: ${registrarFee} (${Number(registrarFee) / 1e10} DOT)`)
    console.log(`  Total: ${total} (${Number(total) / 1e10} DOT)`)

    return {
      basic: basicDeposit,
      field: fieldDeposit,
      registrar: registrarFee,
      total
    }

  } catch (error) {
    console.error('❌ Error calculating deposits:', error)
    throw new Error(`Failed to calculate deposits: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Submit setIdentity transaction to People Chain
 * Sets on-chain identity fields for the account
 */
export async function submitSetIdentity(
  account: InjectedAccountWithMeta,
  identityInfo: any,
  api?: ApiPromise
): Promise<TransactionResult> {
  try {
    console.log('🔐 Initializing wallet extensions...')

    // Get signer from wallet extension
    const extensions = await web3Enable('Intran3t')
    if (extensions.length === 0) {
      throw new Error('No Polkadot wallet extension found. Please install Talisman, SubWallet, or Polkadot.js extension.')
    }

    console.log(`✅ Found ${extensions.length} wallet extension(s)`)

    // Handle both Typink account format and standard extension format
    const walletSource = (account as any).source || account.meta?.source
    if (!walletSource) {
      console.error('Account object:', account)
      throw new Error('Cannot determine wallet source from account')
    }

    console.log(`Getting signer from wallet source: ${walletSource}`)
    const injector = await web3FromSource(walletSource)
    if (!injector.signer) {
      throw new Error('Wallet does not provide signer')
    }

    console.log('✅ Signer obtained from wallet')

    // Connect to People Chain
    const peopleApi = api || await getPeopleChainApi()

    console.log('📝 Building setIdentity transaction...')
    console.log('Identity info structure:', JSON.stringify(identityInfo, null, 2))

    const tx = peopleApi.tx.identity.setIdentity(identityInfo)

    console.log('Transaction created:', tx.toHuman())
    console.log('🚀 Submitting transaction...')

    // Submit transaction with promise wrapper
    return new Promise((resolve, reject) => {
      tx.signAndSend(
        account.address,
        { signer: injector.signer },
        ({ status, dispatchError, events }) => {
          console.log(`Transaction status: ${status.type}`)

          if (status.isInBlock) {
            console.log(`✅ Transaction included in block: ${status.asInBlock.toHex()}`)
          }

          if (status.isFinalized) {
            console.log(`✅ Transaction finalized in block: ${status.asFinalized.toHex()}`)

            // Check for errors
            if (dispatchError) {
              console.error('❌ Transaction failed with error:', dispatchError)

              if (dispatchError.isModule) {
                // Parse module error
                const decoded = peopleApi.registry.findMetaError(dispatchError.asModule)
                const errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`
                console.error('Decoded error:', errorMsg)
                reject(new Error(errorMsg))
              } else {
                reject(new Error(dispatchError.toString()))
              }
              return
            }

            // Success!
            const hash = status.asFinalized.toHex()
            console.log('🎉 Identity set successfully!')
            resolve({ success: true, hash })
          }

          if (status.isInvalid || status.isDropped || status.isUsurped) {
            const errorMsg = `Transaction ${status.type.toLowerCase()}`
            console.error('❌', errorMsg)
            reject(new Error(errorMsg))
          }
        }
      ).catch((error) => {
        console.error('❌ Error signing/sending transaction:', error)

        // Handle user cancellation
        if (error.message?.includes('Cancelled')) {
          reject(new Error('Transaction cancelled by user'))
        } else {
          reject(error)
        }
      })
    })

  } catch (error) {
    console.error('❌ Error in submitSetIdentity:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Submit requestJudgement transaction to People Chain
 * Requests verification from a registrar
 */
export async function submitRequestJudgement(
  account: InjectedAccountWithMeta,
  registrarIndex: number,
  maxFee: bigint,
  api?: ApiPromise
): Promise<TransactionResult> {
  try {
    console.log(`🔐 Requesting judgement from registrar ${registrarIndex}...`)

    // Get signer from wallet extension
    const extensions = await web3Enable('Intran3t')
    if (extensions.length === 0) {
      throw new Error('No Polkadot wallet extension found')
    }

    const injector = await web3FromSource(account.meta.source)
    if (!injector.signer) {
      throw new Error('Wallet does not provide signer')
    }

    // Connect to People Chain
    const peopleApi = api || await getPeopleChainApi()

    console.log('📝 Building requestJudgement transaction...')
    const tx = peopleApi.tx.identity.requestJudgement(registrarIndex, maxFee)

    console.log('🚀 Submitting judgement request...')

    // Submit transaction
    return new Promise((resolve, reject) => {
      tx.signAndSend(
        account.address,
        { signer: injector.signer },
        ({ status, dispatchError }) => {
          console.log(`Transaction status: ${status.type}`)

          if (status.isInBlock) {
            console.log(`✅ Transaction included in block: ${status.asInBlock.toHex()}`)
          }

          if (status.isFinalized) {
            console.log(`✅ Transaction finalized in block: ${status.asFinalized.toHex()}`)

            // Check for errors
            if (dispatchError) {
              console.error('❌ Transaction failed with error:', dispatchError)

              if (dispatchError.isModule) {
                const decoded = peopleApi.registry.findMetaError(dispatchError.asModule)
                const errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`
                console.error('Decoded error:', errorMsg)
                reject(new Error(errorMsg))
              } else {
                reject(new Error(dispatchError.toString()))
              }
              return
            }

            // Success!
            const hash = status.asFinalized.toHex()
            console.log('🎉 Judgement requested successfully!')
            resolve({ success: true, hash })
          }

          if (status.isInvalid || status.isDropped || status.isUsurped) {
            const errorMsg = `Transaction ${status.type.toLowerCase()}`
            console.error('❌', errorMsg)
            reject(new Error(errorMsg))
          }
        }
      ).catch((error) => {
        console.error('❌ Error signing/sending transaction:', error)

        // Handle user cancellation
        if (error.message?.includes('Cancelled')) {
          reject(new Error('Transaction cancelled by user'))
        } else {
          reject(error)
        }
      })
    })

  } catch (error) {
    console.error('❌ Error in submitRequestJudgement:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get account from connected wallet extension
 * Helper function to get InjectedAccountWithMeta from address
 */
export async function getInjectedAccount(address: string): Promise<InjectedAccountWithMeta | null> {
  try {
    const extensions = await web3Enable('Intran3t')
    if (extensions.length === 0) {
      console.error('No wallet extensions found')
      return null
    }

    // Get all accounts from all extensions
    const { web3Accounts } = await import('@polkadot/extension-dapp')
    const accounts = await web3Accounts()

    // Find account by address
    const account = accounts.find(acc => acc.address === address)
    if (!account) {
      console.error(`Account not found for address: ${address}`)
      return null
    }

    return account

  } catch (error) {
    console.error('Error getting injected account:', error)
    return null
  }
}
