/**
 * Stealth Core Library - Fluidkey / SHIP-03 Compatible
 *
 * Implements ERC-5564 inspired stealth addresses using Fluidkey Stealth Account Kit.
 * Compatible with Shogun Wallet (SHIP-03).
 */

import { ethers } from "ethers";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
    generateStealthAddresses,
    generateStealthPrivateKey,
} from "@fluidkey/stealth-account-kit";

// Helper to convert Uint8Array to Hex with 0x prefix
const toHex = (arr: Uint8Array) =>
    "0x" +
    Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

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

        // If it's 64 hex chars (32 bytes), it might be a pkx (X coordinate).
        // On-chain announcements from PaymentForwarder only emit X.
        // We'll treat this as "need reconstruction" later, but for now, 
        // we'll return it as 0x + hex and let the consumer handle prefixes.
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
    neuralPriv: string; // Private key for the Neural Identity (derived from Gun)
}

export interface StealthAnnouncement {
    id: string;
    ephemeralPubKey: string; // E (compressed hex)
    stealthAddress: string; // P (Ethereum address)
    viewTag: string; // SHIP-03 view tag (0xNN)
    metadata?: string; // Optional encrypted data
    timestamp: number;
}

export interface StealthRegistryEntry {
    spendingPubKey: string; // S
    viewingPubKey: string;  // V
    pub: string;            // GunDB user public key
    alias?: string;         // Optional human-readable alias
    updatedAt: number;
}

/**
 * Derive stealth keys from Gun SEA identity using SHIP-03 salts.
 */
export function deriveStealthKeysFromGun(seaEpriv: string): StealthKeys {
    // 1. Derive Neural Identity (Legacy identity address derivation)
    const neuralSeed = keccak_256(ethers.toUtf8Bytes(seaEpriv));
    const neuralPriv = toHex(neuralSeed);

    // 2. Derive Stealth Keys (SHIP-03 compliant derivation)
    const viewingSeed = ethers.keccak256(
        ethers.toUtf8Bytes("SHIP-03-VIEWING" + seaEpriv)
    );
    const viewingWallet = new ethers.Wallet(viewingSeed);

    const spendingSeed = ethers.keccak256(
        ethers.toUtf8Bytes("SHIP-03-SPENDING" + seaEpriv)
    );
    const spendingWallet = new ethers.Wallet(spendingSeed);

    return {
        spending: {
            priv: spendingWallet.privateKey,
            pub: normalizePublicKey(spendingWallet.signingKey.publicKey),
        },
        viewing: {
            priv: viewingWallet.privateKey,
            pub: normalizePublicKey(viewingWallet.signingKey.publicKey),
        },
        neuralPriv,
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
        ephemeralPrivateKey: ephemeralPrivateKey as `0x${string}`,
        spendingPublicKeys: [normalizedSpendingKey as `0x${string}`],
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
    _viewingPrivKey: string,
    spendingPrivKey: string
): ethers.Wallet {
    // Normalize keys
    const normalizedEphemeralKey = normalizePublicKey(ephemeralPublicKey);

    // Try Fluidkey
    const result = generateStealthPrivateKey({
        ephemeralPublicKey: normalizedEphemeralKey as `0x${string}`,
        spendingPrivateKey: spendingPrivKey as `0x${string}`,
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
// Field prime for secp256k1 (used for fast Y-coordinate negation in shared secret derivation)
const P_FIELD = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;

export function checkStealthAddress(
    ephemeralPubKey: string,
    viewingKey: string | ethers.Wallet,
    spendingPrivKey: string,
    announcedAddress: string,
    viewTag?: string
): ethers.Wallet | null {
    const viewingWallet =
        typeof viewingKey === "string" ? new ethers.Wallet(viewingKey) : viewingKey;
    const viewingPrivKey = viewingWallet.privateKey;

    // Fast-path: Pre-normalize tag outside the loop
    const hasTag = viewTag && viewTag !== "0x00" && viewTag !== "0x" && viewTag !== "0x01";
    const normalizedTag = hasTag ? (viewTag!.startsWith("0x") ? viewTag!.toLowerCase() : "0x" + viewTag!.toLowerCase()) : null;

    const tryCheck = (pk: string, precomputedSS?: string): ethers.Wallet | null => {
        try {
            const normalizedEphemeralKey = normalizePublicKey(pk);

            // 1. Optional fast tag check
            if (hasTag) {
                // Reuse precomputed shared secret if available to avoid redundant EC multiplication
                const ssTag = precomputedSS || viewingWallet.signingKey.computeSharedSecret(normalizedEphemeralKey);
                const hTag = ethers.keccak256(ssTag);
                const computedTag = hTag.slice(0, 6).toLowerCase();

                if (computedTag !== normalizedTag) {
                    return null;
                }
            }

            // 2. Definitive check
            const wallet = openStealthAddress(
                announcedAddress,
                normalizedEphemeralKey,
                viewingPrivKey,
                spendingPrivKey
            );
            return wallet;
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
        const pk02 = "0x02" + pk;
        const pk03 = "0x03" + pk;

        // X-only Optimization: If we have a tag, compute 0x02 shared secret via EC mult.
        // Then derive 0x03 shared secret via fast modular negation of the Y-coordinate (p - Y),
        // bypassing a second expensive EC multiplication (~50% speedup per X-only scan).
        if (hasTag) {
            try {
                const ss02 = viewingWallet.signingKey.computeSharedSecret(normalizePublicKey(pk02));

                const match02 = tryCheck(pk02, ss02);
                if (match02) return match02;

                // Derive 0x03 shared secret by negating Y
                const xHex = ss02.slice(4, 68);
                const yHex = ss02.slice(68, 132);
                const y = BigInt("0x" + yHex);
                const negatedY = P_FIELD - y;
                const negatedYHex = negatedY.toString(16).padStart(64, "0");
                const ss03 = "0x04" + xHex + negatedYHex;

                return tryCheck(pk03, ss03);
            } catch (e) {
                // Fallback to unoptimized path if EC math fails
            }
        }

        return tryCheck(pk02) || tryCheck(pk03);
    }

    return null;
}

/**
 * Scan a list of announcements to find the ones the receiver controls.
 * Async to prevent blocking main thread.
 */
export async function scanAnnouncements(
    announcements: StealthAnnouncement[],
    keys: StealthKeys
): Promise<Array<StealthAnnouncement & { wallet: ethers.Wallet; privateKey: string }>> {
    const owned: Array<
        StealthAnnouncement & { wallet: ethers.Wallet; privateKey: string }
    > = [];

    console.log(`[Stealth] Scanning ${announcements.length} announcements...`);

    // Optimization: Create viewing wallet once to avoid re-deriving public key for every announcement
    const viewingWallet = new ethers.Wallet(keys.viewing.priv);
    const chunkSize = 20;

    for (let i = 0; i < announcements.length; i++) {
        const ann = announcements[i];
        const wallet = checkStealthAddress(
            ann.ephemeralPubKey,
            viewingWallet,
            keys.spending.priv,
            ann.stealthAddress,
            ann.viewTag
        );
        if (wallet) {
            owned.push({ ...ann, wallet, privateKey: wallet.privateKey });
        }

        // Yield every chunk
        if (i % chunkSize === 0 && i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    console.log(`[Stealth] Scan complete. Found ${owned.length} owned cells.`);
    return owned;
}

/**
 * Legacy identity derivation.
 */
export function gunPairToEthAddress(seaEpriv: string): string {
    const seed = keccak_256(ethers.toUtf8Bytes(seaEpriv));
    const privKey = toHex(seed);
    const wallet = new ethers.Wallet(privKey);
    return wallet.address;
}
