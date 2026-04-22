/**
 * Stealth Core Library - Fluidkey / SHIP-03 Compatible
 *
 * Implements ERC-5564 inspired stealth addresses using Fluidkey Stealth Account Kit.
 * Compatible with Null Route (SHIP-03).
 */

import { ethers } from "ethers";
import ZEN from "../zen/crypto";
import {
    generateStealthAddresses,
    generateStealthPrivateKey,
} from "@fluidkey/stealth-account-kit";

// Helper to convert Uint8Array to Hex with 0x prefix
const toHex = (arr: Uint8Array) => "0x" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");

/**
 * Normalize public key to compressed format (33 bytes)
 */
function normalizePublicKey(publicKey: string): string {
    try {
        let normalized = publicKey;

        if (normalized.startsWith("0x")) {
            normalized = normalized.slice(2);
        }

        // If uncompressed (130 hex chars = 65 bytes), compute set true for compressed
        if (normalized.length === 130) {
            return ethers.SigningKey.computePublicKey("0x" + normalized, true);
        }

        // If already compressed (66 hex chars = 33 bytes), ensure 0x prefix
        if (normalized.length === 66) {
            return "0x" + normalized;
        }

        if (normalized.length === 64) {
            return "0x" + normalized;
        }

        throw new Error(`Invalid public key length: ${normalized.length}`);
    } catch (error) {
        console.error("Error normalizing public key:", publicKey, error);
        throw error;
    }
}

export interface StealthKeys {
    spending: {
        priv: string;
        pub: string;
    };
    viewing: {
        priv: string;
        pub: string;
    };
    neuralPriv: string; // Private key for the Neural Identity (derived from Zen)
}

export interface StealthAnnouncement {
    id: string;
    ephemeralPubKey: string; // E (compressed hex)
    stealthAddress: string; // P (Ethereum address)
    viewTag: string; // SHIP-03 view tag (0xNN)
    metadata?: string; // Optional encrypted data
    timestamp: number;
}

/**
 * Derive stealth keys from Zen identity using deterministic sub-paires.
 * Replaces legacy shogun-core.derive
 */
export async function deriveStealthKeysFromZen(seaEpriv: string): Promise<StealthKeys> {
    if (typeof seaEpriv !== "string") {
        throw new Error(`seaEpriv must be a string, got ${typeof seaEpriv}`);
    }
    
    // 1. Derive Neural Identity (Account 0) - EVM compatible 
    // We use a custom label for each account to stay bitwise stable within Zen
    const neuralPair = await ZEN.pair(null, { seed: seaEpriv, label: "NULL|ROUTE|NEURAL|0" });

    // 2. Derive Stealth Keys (Spending: Account 1, Viewing: Account 2)
    const spendingPair = await ZEN.pair(null, { seed: seaEpriv, label: "NULL|ROUTE|SPENDING|1" });
    const viewingPair = await ZEN.pair(null, { seed: seaEpriv, label: "NULL|ROUTE|VIEWING|2" });

    // Zen priv keys are base-encoded strings, not 32-byte hex.
    // We hash them deterministically into valid scalars for ethers.
    const deriveEthPriv = (zenPriv: string) => ethers.keccak256(ethers.toUtf8Bytes(zenPriv));

    const spendingWallet = new ethers.Wallet(deriveEthPriv(spendingPair.priv));
    const viewingWallet = new ethers.Wallet(deriveEthPriv(viewingPair.priv));
    const neuralWallet = new ethers.Wallet(deriveEthPriv(neuralPair.priv));

    return {
        spending: {
            priv: spendingWallet.privateKey,
            pub: normalizePublicKey(spendingWallet.signingKey.publicKey),
        },
        viewing: {
            priv: viewingWallet.privateKey,
            pub: normalizePublicKey(viewingWallet.signingKey.publicKey),
        },
        neuralPriv: neuralWallet.privateKey,
    };
}

/**
 * Generate an Ethereum stealth address for a recipient using Fluidkey.
 */
export function generateStealthAddress(
    spendingPubKey: string,
    viewingPubKey: string
): {
    stealthAddress: string;
    ephemeralPubKey: string;
    sharedSecretHash: string;
    viewTag: string;
} {
    // 1. Generate ephemeral key pair
    const ephemeralWallet = ethers.Wallet.createRandom();
    const ephemeralPrivateKey = ephemeralWallet.privateKey;
    const ephemeralPublicKey = normalizePublicKey(ephemeralWallet.signingKey.publicKey);

    // Normalize recipient keys
    const normalizedViewingKey = normalizePublicKey(viewingPubKey);
    const normalizedSpendingKey = normalizePublicKey(spendingPubKey);

    // 2. Compute shared secret ssTag = e * V (for tag check)
    const ssTag = ephemeralWallet.signingKey.computeSharedSecret(normalizedViewingKey);
    const hTag = ethers.keccak256(ssTag);
    const viewTag = hTag.slice(0, 6); // 0xNNNN

    // 3. Use Fluidkey to generate the stealth address
    const result = generateStealthAddresses({
        ephemeralPrivateKey: ephemeralPrivateKey,
        spendingPublicKeys: [normalizedSpendingKey],
    });

    return {
        stealthAddress: result.stealthAddresses[0],
        ephemeralPubKey: ephemeralPublicKey,
        sharedSecretHash: hTag, // Tag secret
        viewTag,
    };
}

/**
 * Open/unlock a stealth address to derive private key using Fluidkey.
 */
export function openStealthAddress(
    stealthAddress: string,
    ephemeralPublicKey: string,
    viewingPrivKey: string,
    spendingPrivKey: string
): ethers.Wallet {
    // Normalize keys
    const normalizedEphemeralKey = normalizePublicKey(ephemeralPublicKey);

    // Try Fluidkey
    const result = generateStealthPrivateKey({
        ephemeralPublicKey: normalizedEphemeralKey,
        spendingPrivateKey: spendingPrivKey,
    });

    const wallet = new ethers.Wallet(result.stealthPrivateKey);

    if (wallet.address.toLowerCase() !== stealthAddress.toLowerCase()) {
        throw new Error("Derived address mismatch");
    }

    return wallet;
}

/**
 * Scan an announcement to see if it belongs to the receiver.
 */
export function checkStealthAddress(
    ephemeralPubKey: string,
    viewingPrivKey: string,
    spendingPrivKey: string,
    announcedAddress: string,
    viewTag?: string,
    viewingSigningKey?: ethers.SigningKey
): ethers.Wallet | null {
    // Optimization: Use provided SigningKey or create once at function level
    const signingKey = viewingSigningKey || new ethers.SigningKey(viewingPrivKey);

    const tryCheck = (pk: string): ethers.Wallet | null => {
        try {
            const normalizedEphemeralKey = normalizePublicKey(pk);

            // 1. Optional fast tag check
            if (viewTag && viewTag !== "0x00" && viewTag !== "0x" && viewTag !== "0x01") {
                const ssTag = signingKey.computeSharedSecret(normalizedEphemeralKey);
                const hTag = ethers.keccak256(ssTag);
                const computedTag = hTag.slice(0, 6).toLowerCase();
                const normalizedTag = viewTag.startsWith("0x") ? viewTag.toLowerCase() : "0x" + viewTag.toLowerCase();

                if (computedTag !== normalizedTag) {
                    return null;
                }
            }

            // 2. Definitive check
            return openStealthAddress(
                announcedAddress,
                normalizedEphemeralKey,
                viewingPrivKey,
                spendingPrivKey
            );
        } catch {
            return null;
        }
    };

    // If pk is 33 bytes (66 chars + 0x), try as is.
    // If pk is 32 bytes (64 chars + 0x), try with both 0x02 and 0x03 prefixes (pkx reconstruction).
    let pk = ephemeralPubKey;
    if (pk.startsWith("0x")) pk = pk.slice(2);

    if (pk.length === 66) {
        return tryCheck("0x" + pk);
    } else if (pk.length === 64) {
        return tryCheck("0x02" + pk) || tryCheck("0x03" + pk);
    }

    return null;
}

/**
 * Scan a list of announcements to find the ones the receiver controls.
 */
export function scanAnnouncements(
    announcements: StealthAnnouncement[],
    keys: StealthKeys
): Array<StealthAnnouncement & { wallet: ethers.Wallet; privateKey: string }> {
    const owned: Array<
        StealthAnnouncement & { wallet: ethers.Wallet; privateKey: string }
    > = [];

    console.log(`[Stealth] Scanning ${announcements.length} announcements...`);

    // Optimization: Create SigningKey once for the entire scan
    const viewingSigningKey = new ethers.SigningKey(keys.viewing.priv);

    for (const ann of announcements) {
        const wallet = checkStealthAddress(
            ann.ephemeralPubKey,
            keys.viewing.priv,
            keys.spending.priv,
            ann.stealthAddress,
            ann.viewTag,
            viewingSigningKey
        );

        if (wallet) {
            owned.push({ ...ann, wallet, privateKey: wallet.privateKey });
        }
    }

    console.log(`[Stealth] Scan complete. Found ${owned.length} owned cells.`);
    return owned;
}

/**
 * Validate and format the deterministic seed from Zen.
 */
function getValidSeed(seed: string): Uint8Array {
  if (!seed || typeof seed !== 'string') throw new Error('Seed must be a string');
  if (seed.trim() === '') throw new Error('Seed cannot be empty');
  return Buffer.from(seed);
}
