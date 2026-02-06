import { mnemonicToMiniSecret, ss58Encode } from "@polkadot-labs/hdkd-helpers";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export interface WalletInfo {
  mnemonic: string;
  address: string;
  publicKey: Uint8Array;
  sign: (data: Uint8Array) => Uint8Array;
}

/**
 * Generate a random BIP39 mnemonic (12 words)
 */
export function generateRandomMnemonic(): string {
  return generateMnemonic(wordlist, 128); // 128 bits = 12 words
}

/**
 * Derive wallet from mnemonic phrase
 */
export function deriveWallet(mnemonic: string): WalletInfo {
  const miniSecret = mnemonicToMiniSecret(mnemonic, "");
  const derive = sr25519CreateDerive(miniSecret);
  const wallet = derive("//wallet");

  // Encode SS58 address (42 = generic substrate prefix)
  const address = ss58Encode(wallet.publicKey, 42);

  return {
    mnemonic,
    address,
    publicKey: wallet.publicKey,
    sign: wallet.sign,
  };
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }
    // Try to derive a wallet - if it works, mnemonic is valid
    mnemonicToMiniSecret(mnemonic, "");
    return true;
  } catch {
    return false;
  }
}
