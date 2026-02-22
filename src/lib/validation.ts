
import { ethers } from "ethers";
import type { StealthAnnouncement } from "./stealthCore";

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
  return trimmed.length > 3;
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
  // Should match 0x hex format.
  if (!/^0x[0-9a-fA-F]+$/.test(data.ephemeralPubKey)) return false;

  // 3. Validate stealthAddress (valid ETH address)
  if (typeof data.stealthAddress !== 'string' || !isValidEthAddress(data.stealthAddress)) return false;

  // 4. Validate viewTag (hex string)
  if (typeof data.viewTag !== 'string') return false;
  if (!/^0x[0-9a-fA-F]+$/.test(data.viewTag)) return false;

  // 5. Validate timestamp (number)
  if (typeof data.timestamp !== 'number' || isNaN(data.timestamp)) return false;

  // 6. Validate metadata (optional string)
  if (data.metadata !== undefined && typeof data.metadata !== 'string') return false;

  return true;
}
