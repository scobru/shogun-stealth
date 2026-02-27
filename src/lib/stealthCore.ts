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

// secp256k1 Curve Prime P
const CURVE_P = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");

/**
 * Negate the Y coordinate of a point on secp256k1 (P - y) mod P
 * Used to derive the shared secret for 0x03 prefix from 0x02 prefix without re-multiplication.
 */
function negateY(yHex: string): string {
    const y = BigInt("0x" + yHex);
    const negY = (CURVE_P - y) % CURVE_P;
    return negY.toString(16).padStart(64, '0');
}

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
    viewingKey: string | ethers.Wallet,
    spendingPrivKey: string,
    announcedAddress: string,
    viewTag?: string
): ethers.Wallet | null {
    const viewingWallet =
        typeof viewingKey === "string" ? new ethers.Wallet(viewingKey) : viewingKey;
    // If viewingKey is a string, we might need it later for openStealthAddress if we don't pass the wallet there?
    // Actually openStealthAddress takes viewingPrivKey as string.
    // So if viewingKey is a Wallet, we need its private key string for openStealthAddress.
    const viewingPrivKey = viewingWallet.privateKey;

    const tryCheck = (pk: string): ethers.Wallet | null => {
        try {
            const normalizedEphemeralKey = normalizePublicKey(pk);

            // 1. Optional fast tag check
            if (viewTag && viewTag !== "0x00" && viewTag !== "0x" && viewTag !== "0x01") {
                // Use the pre-computed wallet/key pair
                const ssTag = viewingWallet.signingKey.computeSharedSecret(normalizedEphemeralKey);
                const hTag = ethers.keccak256(ssTag);
                const computedTag = hTag.slice(0, 6).toLowerCase();
                const normalizedTag = viewTag.startsWith("0x") ? viewTag.toLowerCase() : "0x" + viewTag.toLowerCase();

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

    // X-only optimization: When we have an X coordinate (64 hex), we can avoid 2 EC mults.
    // We compute shared secret for 0x02, check tag. If fails, we negate Y to get shared secret for 0x03.
    if (pk.length === 64 && viewTag && viewTag !== "0x00" && viewTag !== "0x" && viewTag !== "0x01") {
        try {
            const normalizedTag = viewTag.startsWith("0x") ? viewTag.toLowerCase() : "0x" + viewTag.toLowerCase();
            const tagLength = normalizedTag.length; // e.g. 4 for 1 byte (0x12), 6 for 2 bytes (0x1234)

            // 1. Try 0x02 prefix
            const pk02 = "0x02" + pk;

            // Compute shared secret for 02
            const ss02 = viewingWallet.signingKey.computeSharedSecret(pk02);
            // ss02 is uncompressed point: 0x04 (2) + X (64) + Y (64) = 130 chars (hex)

            // Check tag for 02
            const hTag02 = ethers.keccak256(ss02);
            // Dynamic slice based on provided viewTag length
            const computedTag02 = hTag02.slice(0, tagLength).toLowerCase();

            if (computedTag02 === normalizedTag) {
                // Found match with 0x02!
                const w = openStealthAddress(announcedAddress, pk02, viewingPrivKey, spendingPrivKey);
                if (w) return w;
            }

            // 2. Try 0x03 prefix using Negation Optimization
            // We need the SS for 0x03 without doing EC mult.
            // SS03.x = SS02.x
            // SS03.y = -SS02.y (mod P)

            // Extract Y from ss02 (0x04...X...Y)
            // 0x (2) + 04 (2) + X (64) = 68 chars for prefix + X
            const x = ss02.slice(4, 68);
            const y02 = ss02.slice(68);
            const y03 = negateY(y02);

            // Reconstruct SS03: 0x04 + X + Y03
            const ss03 = "0x04" + x + y03;

            const hTag03 = ethers.keccak256(ss03);
            const computedTag03 = hTag03.slice(0, tagLength).toLowerCase();

            if (computedTag03 === normalizedTag) {
                // Found match with 0x03!
                const pk03 = "0x03" + pk;
                const w = openStealthAddress(announcedAddress, pk03, viewingPrivKey, spendingPrivKey);
                if (w) return w;
            }

            return null; // Both failed tag check

        } catch (e) {
            // Fallthrough to regular check if optimization fails for any reason
        }
    }

    if (pk.length === 66) {
        return tryCheck("0x" + pk);
    } else if (pk.length === 64) {
        return tryCheck("0x02" + pk) || tryCheck("0x03" + pk);
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
