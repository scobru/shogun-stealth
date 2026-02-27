
import { ethers } from "ethers";
import type { StealthAnnouncement, StealthRegistryEntry } from "./stealthCore";

/**
 * Validates if the given string is a valid Ethereum amount (positive number).
 * @param amount The amount string to validate.
 * @returns True if valid, false otherwise.
 */
export function isValidEthAmount(amount: string): boolean {
  try {
    if (!amount || amount.trim() === "") return false;

    // Check if it's a valid number string first
    if (!/^\d*\.?\d+$/.test(amount)) return false;

    const value = ethers.parseEther(amount);
    return value > BigInt(0);
  } catch (error) {
    return false;
  }
}

/**
 * Validates if the given string is a valid Ethereum address.
 * @param address The address string to validate.
 * @returns True if valid, false otherwise.
 */
export function isValidEthAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Validates if a string is a valid SECP256k1 public key (hex format).
 * Accepts compressed (33 bytes) or uncompressed (65 bytes) keys.
 * Also accepts raw X coordinates (32 bytes) used in some stealth announcements.
 * @param key The public key string to validate.
 * @returns True if valid, false otherwise.
 */
export function isValidPublicKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;

    // Must start with 0x
    if (!key.startsWith('0x')) return false;

    // Check hex characters
    if (!/^0x[0-9a-fA-F]+$/.test(key)) return false;

    // Length check (including 0x prefix):
    // 32 bytes (raw X)     = 66 chars
    // 33 bytes (compressed) = 68 chars
    // 65 bytes (uncompressed) = 132 chars
    const length = key.length;
    return length === 66 || length === 68 || length === 132;
}

/**
 * Validates if the recipient string is valid (either an ETH address or a Gun public key).
 * Gun public keys are generally base64 strings, but for now we just check it's not empty
 * and has a reasonable length.
 * @param recipient The recipient string.
 * @returns True if valid, false otherwise.
 */
export function isValidRecipient(recipient: string): boolean {
  if (!recipient || recipient.trim() === "") return false;

  const trimmed = recipient.trim();

  if (isValidEthAddress(trimmed)) return true;

  // Basic check for Gun public key or alias.
  // We'll enforce a minimum length to avoid garbage, but allow aliases (e.g. "user").
  // Security Enhancement: prevent XSS/injection by allowing only safe characters.
  // Allowed: Alphanumeric, ., _, -, ~, +, /, =
  if (trimmed.length <= 3) return false;

  return /^[a-zA-Z0-9._~+/=-]+$/.test(trimmed);
}

/**
 * Sanitizes an alias string to prevent potential injection or UI issues.
 * Allows alphanumeric, dots, underscores, and hyphens.
 * limits length to 32 characters.
 * @param alias The alias to sanitize.
 * @returns The sanitized alias.
 */
export function sanitizeAlias(alias: string): string {
  if (!alias) return "";

  // Remove any character that is not alphanumeric, ., _, or -
  const sanitized = alias.replace(/[^a-zA-Z0-9._-]/g, "");

  // Limit length
  return sanitized.slice(0, 32);
}

/**
 * Checks if a string contains potentially unsafe characters (HTML/Script injection vectors).
 * Explicitly disallows '<' and '>' characters.
 * @param text The text to check.
 * @returns True if safe, false if contains dangerous characters.
 */
export function isSafeText(text: string): boolean {
  if (!text) return true;
  // Disallow < and > to prevent HTML tag injection
  return !/[<>]/.test(text);
}

/**
 * Validates a stealth announcement object.
 * @param data The data to validate.
 * @returns True if valid StealthAnnouncement, false otherwise.
 */
export function isValidStealthAnnouncement(data: any): data is StealthAnnouncement {
  if (!data || typeof data !== 'object') return false;

  // 1. Check ID (string, non-empty)
  if (typeof data.id !== 'string' || data.id.trim() === '') return false;

  // 2. Validate ephemeralPubKey (hex string)
  if (typeof data.ephemeralPubKey !== 'string') return false;
  // Use stricter validation
  if (!isValidPublicKey(data.ephemeralPubKey)) return false;

  // 3. Validate stealthAddress (valid ETH address)
  if (typeof data.stealthAddress !== 'string' || !isValidEthAddress(data.stealthAddress)) return false;

  // 4. Validate viewTag (hex string)
  if (typeof data.viewTag !== 'string') return false;
  if (!/^0x[0-9a-fA-F]+$/.test(data.viewTag)) return false;

  // 5. Validate timestamp (number)
  if (typeof data.timestamp !== 'number' || isNaN(data.timestamp)) return false;

  // 6. Validate metadata (optional string)
  if (data.metadata !== undefined) {
      if (typeof data.metadata !== 'string') return false;
      // Security Enhancement: Limit metadata length to prevent DoS/memory issues
      // 4KB limit
      if (data.metadata.length > 4096) return false;

      // Security Enhancement: Prevent HTML injection in metadata
      if (!isSafeText(data.metadata)) return false;
  }

  return true;
}

/**
 * Validates a stealth registry entry object.
 * Ensures that keys are valid hex strings and alias is sanitized.
 * @param data The data to validate.
 * @returns True if valid StealthRegistryEntry, false otherwise.
 */
export function isValidStealthRegistryEntry(data: any): data is StealthRegistryEntry {
    if (!data || typeof data !== 'object') return false;

    // 1. Validate spendingPubKey (hex string)
    if (typeof data.spendingPubKey !== 'string') return false;
    // Use stricter validation
    if (!isValidPublicKey(data.spendingPubKey)) return false;

    // 2. Validate viewingPubKey (hex string)
    if (typeof data.viewingPubKey !== 'string') return false;
    // Use stricter validation
    if (!isValidPublicKey(data.viewingPubKey)) return false;

    // 3. Validate pub (Gun user public key)
    if (typeof data.pub !== 'string') return false;
    // Use existing recipient validation which handles Gun keys
    if (!isValidRecipient(data.pub)) return false;

    // 4. Validate alias (optional string)
    if (data.alias !== undefined) {
        if (typeof data.alias !== 'string') return false;
        // Check if alias contains only safe characters and length limit
        // We enforce strict alias rules here to prevent injection.
        if (data.alias.length > 32) return false;
        if (!/^[a-zA-Z0-9._-]+$/.test(data.alias) && data.alias !== "") return false;
    }

    // 5. Validate updatedAt (number)
    if (typeof data.updatedAt !== 'number' || isNaN(data.updatedAt)) return false;

    return true;
}
