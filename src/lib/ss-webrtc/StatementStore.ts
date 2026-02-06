/**
 * StatementStore: Low-level read/write operations for the statement store
 *
 * This module handles the blockchain communication layer, providing a clean
 * abstraction for reading and writing to single-writer channels.
 */

import { withPolkadotSdkCompat } from '@polkadot-api/polkadot-sdk-compat'
import {
  createStatementSdk,
  getStatementSigner,
  stringToTopic
} from '@polkadot-api/sdk-statement'
import { Binary } from '@polkadot-api/substrate-bindings'
import { createClient } from '@polkadot-api/substrate-client'
import { toHex } from '@polkadot-api/utils'
import { getWsProvider } from '@polkadot-api/ws-provider'
import { sr25519CreateDerive } from '@polkadot-labs/hdkd'
import { mnemonicToMiniSecret } from '@polkadot-labs/hdkd-helpers'

import type { ChannelValue, LogType } from './types'

export interface StatementStoreConfig {
  endpoint: string
  documentId: string
  mnemonic: string
  onLog?: (message: string, type: LogType) => void
}

/**
 * StatementStore provides read/write access to the blockchain statement store.
 *
 * Key properties:
 * - Each channel stores exactly one value (last-write-wins)
 * - Writes overwrite previous values based on timestamp/priority
 * - Channels are identified by a unique string name
 */
export class StatementStore {
  private endpoint: string
  private documentId: string
  private mnemonic: string
  private onLog: (message: string, type: LogType) => void

  private client: ReturnType<typeof createClient> | null = null
  private sdk: ReturnType<typeof createStatementSdk> | null = null
  private signer: ReturnType<typeof getStatementSigner> | null = null
  private publicKeyHex: string = ''

  constructor(config: StatementStoreConfig) {
    this.endpoint = config.endpoint
    this.documentId = config.documentId
    this.mnemonic = config.mnemonic
    this.onLog = config.onLog || (() => {})
  }

  /**
   * Connect to the Substrate node
   */
  async connect(): Promise<void> {
    this.onLog('Connecting to Substrate node...', 'info')

    // Derive wallet from mnemonic
    const miniSecret = mnemonicToMiniSecret(this.mnemonic)
    const derive = sr25519CreateDerive(miniSecret)
    const wallet = derive('//wallet')

    this.publicKeyHex = toHex(wallet.publicKey)
    this.signer = getStatementSigner(wallet.publicKey, 'sr25519', wallet.sign)

    const provider = getWsProvider(this.endpoint)
    this.client = createClient(withPolkadotSdkCompat(provider))
    this.sdk = createStatementSdk(this.client.request)

    this.onLog(`Connected to: ${this.endpoint}`, 'blockchain')
    this.onLog(`Public Key: ${this.publicKeyHex.substring(0, 20)}...`, 'blockchain')
  }

  /**
   * Disconnect from the Substrate node
   */
  disconnect(): void {
    if (this.client) {
      this.client.destroy()
      this.client = null
    }
    this.sdk = null
    this.signer = null
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.sdk !== null && this.signer !== null
  }

  /**
   * Get the public key hex
   */
  getPublicKeyHex(): string {
    return this.publicKeyHex
  }

  /**
   * Write a value to a channel
   *
   * Single-writer rule: Only the owner of a channel should write to it.
   * The caller is responsible for ensuring this invariant.
   */
  async write(channel: string, value: ChannelValue): Promise<boolean> {
    if (!this.sdk || !this.signer) {
      throw new Error('Not connected to Substrate')
    }

    const json = JSON.stringify(value)

    try {
      const bytes = new TextEncoder().encode(json)
      const statement = {
        decryptionKey: stringToTopic(this.documentId),
        priority: value.timestamp,
        channel: stringToTopic(channel),
        topics: [stringToTopic('intran3t-forms'), stringToTopic(value.type)],
        data: Binary.fromBytes(bytes)
      }

      const signedStatement = await this.signer.sign(statement)
      await this.sdk.submit(signedStatement)

      this.onLog(`Written to ${channel.split('/').pop()}`, 'blockchain')
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      this.onLog(`Failed to write to ${channel}: ${msg}`, 'error')
      return false
    }
  }

  /**
   * Read all values from channels matching a topic filter
   *
   * Returns parsed channel values with their channel names.
   */
  async readAll(topicFilter?: string): Promise<Map<string, ChannelValue>> {
    if (!this.sdk) {
      throw new Error('Not connected to Substrate')
    }

    const results = new Map<string, ChannelValue>()

    try {
      const topics = [stringToTopic('intran3t-forms')]
      if (topicFilter) {
        topics.push(stringToTopic(topicFilter))
      }

      const statements = await this.sdk.getStatements({
        dest: stringToTopic(this.documentId),
        topics
      })

      for (const stmt of statements) {
        if (!stmt.data) continue

        try {
          const bytes = stmt.data.asBytes()
          if (bytes.length === 0) continue

          const json = new TextDecoder().decode(bytes)
          const value = JSON.parse(json) as ChannelValue

          // Use a composite key based on value type and identifiers
          const key = this.getChannelKey(value)
          if (key) {
            // Only keep the newest value for each channel (last-write-wins)
            const existing = results.get(key)
            if (!existing || value.timestamp > existing.timestamp) {
              results.set(key, value)
            }
          }
        } catch {
          // Skip malformed messages
          continue
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      this.onLog(`Failed to read statements: ${msg}`, 'error')
    }

    return results
  }

  /**
   * Read form schema for a specific form
   */
  async readFormSchema(formId: string): Promise<ChannelValue | null> {
    const results = await this.readAll('form-schema')
    for (const [key, value] of results.entries()) {
      if (value.type === 'form-schema' && value.formId === formId) {
        return value
      }
    }
    return null
  }

  /**
   * Read all responses for a specific form
   */
  async readFormResponses(formId: string): Promise<Map<string, ChannelValue>> {
    const allResponses = await this.readAll('form-response')
    const formResponses = new Map<string, ChannelValue>()

    for (const [key, value] of allResponses.entries()) {
      if (value.type === 'form-response' && value.formId === formId) {
        formResponses.set(key, value)
      }
    }

    return formResponses
  }

  /**
   * Get a unique key for a channel value based on its type
   */
  private getChannelKey(value: ChannelValue): string | null {
    switch (value.type) {
      case 'form-schema':
        return `form-schema/${value.formId}`
      case 'form-response':
        return `form-response/${value.responseId}`
      default:
        return null
    }
  }
}
