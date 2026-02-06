import Cookies from "js-cookie";

const MNEMONIC_COOKIE_KEY = "intran3t_forms_mnemonic";
const WALLET_ADDRESS_COOKIE_KEY = "intran3t_forms_address";

// Cookie options - 30 days expiry, secure in production
const cookieOptions: Cookies.CookieAttributes = {
  expires: 30,
  sameSite: "strict",
  secure: typeof window !== "undefined" && window.location.protocol === "https:",
};

/**
 * Save mnemonic to cookie (browser-based wallet storage)
 */
export function saveMnemonic(mnemonic: string): void {
  Cookies.set(MNEMONIC_COOKIE_KEY, mnemonic, cookieOptions);
}

/**
 * Get mnemonic from cookie
 */
export function getMnemonic(): string | undefined {
  return Cookies.get(MNEMONIC_COOKIE_KEY);
}

/**
 * Remove mnemonic from cookie
 */
export function clearMnemonic(): void {
  Cookies.remove(MNEMONIC_COOKIE_KEY);
}

/**
 * Save wallet address to cookie
 */
export function saveWalletAddress(address: string): void {
  Cookies.set(WALLET_ADDRESS_COOKIE_KEY, address, cookieOptions);
}

/**
 * Get wallet address from cookie
 */
export function getWalletAddress(): string | undefined {
  return Cookies.get(WALLET_ADDRESS_COOKIE_KEY);
}

/**
 * Clear all stored data
 */
export function clearAllStorage(): void {
  clearMnemonic();
  Cookies.remove(WALLET_ADDRESS_COOKIE_KEY);
}

/**
 * Check if user has a stored wallet
 */
export function hasStoredWallet(): boolean {
  return !!getMnemonic();
}

/**
 * Get all stored user data
 */
export function getStoredUserData(): {
  mnemonic: string | undefined;
  address: string | undefined;
} {
  return {
    mnemonic: getMnemonic(),
    address: getWalletAddress(),
  };
}
