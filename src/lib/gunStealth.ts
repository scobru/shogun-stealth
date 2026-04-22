import { v4 as uuidv4 } from "uuid";
import type { StealthAnnouncement, StealthKeys } from "./stealthCore";

const STEALTH_REGISTRY = "shogun/stealth/registry/v2"; // Bumped version for 2-key model
const STEALTH_ANNOUNCEMENTS = "shogun/stealth/announcements/v2";

export interface StealthRegistryEntry {
    spendingPubKey: string; // S
    viewingPubKey: string;  // V
    pub: string;            // Zen user public key
    alias?: string;         // Optional human-readable alias
    updatedAt: number;
}

/**
 * Publish your dual stealth public keys to the public Zen registry.
 */
export async function publishStealthKeys(
    zen: any,
    pub: string,
    keys: StealthKeys,
    alias?: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const entry: StealthRegistryEntry = {
            spendingPubKey: keys.spending.pub,
            viewingPubKey: keys.viewing.pub,
            pub: pub,
            alias: alias || "",
            updatedAt: Date.now(),
        };

        // If zen is a user instance or has _sea, it might need authenticator
        const pair = zen._?.sea || (zen.constructor?.SEA && zen.constructor.SEA.pair);

        zen
            .get(STEALTH_REGISTRY)
            .get(pub)
            .put(entry as any, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            }, pair ? { authenticator: pair } : {});
    });
}

/**
 * Look up a user's dual stealth keys by their Zen public key.
 */
export async function getStealthKeys(
    zen: any,
    targetPub: string
): Promise<StealthRegistryEntry | null> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 5000);

        zen
            .get(STEALTH_REGISTRY)
            .get(targetPub)
            .once((data: StealthRegistryEntry | null) => {
                clearTimeout(timeout);
                resolve(data || null);
            });
    });
}

/**
 * Get all registered stealth addresses from the registry.
 */
export async function getAllRegistered(
    zen: any
): Promise<StealthRegistryEntry[]> {
    return new Promise((resolve) => {
        const results: StealthRegistryEntry[] = [];
        const timeout = setTimeout(() => resolve(results), 5000);

        zen
            .get(STEALTH_REGISTRY)
            .map()
            .once((data: StealthRegistryEntry | null, key: string) => {
                if (data?.spendingPubKey && data?.viewingPubKey) {
                    results.push(data);
                }
            });

        setTimeout(() => {
            clearTimeout(timeout);
            resolve(results);
        }, 4000);
    });
}

/**
 * Publish a stealth announcement to Zen.
 */
export async function publishAnnouncement(
    zen: any,
    announcement: Omit<StealthAnnouncement, "id" | "timestamp">
): Promise<string> {
    const id = uuidv4();
    const full: StealthAnnouncement = {
        ...announcement,
        id,
        timestamp: Date.now(),
    };

    const pair = zen._?.sea;

    return new Promise((resolve, reject) => {
        zen
            .get(STEALTH_ANNOUNCEMENTS)
            .get(id)
            .put(full as any, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve(id);
            }, pair ? { authenticator: pair } : {});
    });
}

/**
 * Subscribe to real-time stealth announcements from Zen.
 */
export function subscribeToAnnouncements(
    zen: any,
    onAnnouncement: (announcement: StealthAnnouncement) => void
): () => void {
    const ref = zen
        .get(STEALTH_ANNOUNCEMENTS)
        .map()
        .on((data: StealthAnnouncement | null) => {
            if (data?.ephemeralPubKey && data?.stealthAddress) {
                onAnnouncement(data);
            }
        });

    return () => {
        if (ref?.off) ref.off();
    };
}

/**
 * Get all past announcements from Zen.
 */
export async function getAllAnnouncements(
    zen: any
): Promise<StealthAnnouncement[]> {
    return new Promise((resolve) => {
        const results: StealthAnnouncement[] = [];
        const timeout = setTimeout(() => resolve(results), 5000);

        zen
            .get(STEALTH_ANNOUNCEMENTS)
            .map()
            .once((data: StealthAnnouncement | null) => {
                if (data?.ephemeralPubKey && data?.stealthAddress) {
                    results.push(data);
                }
            });

        setTimeout(() => {
            clearTimeout(timeout);
            resolve(results);
        }, 4000);
    });
}
/**
 * Delete (nullify) an announcement from Zen.
 */
export async function deleteAnnouncement(
    zen: any,
    id: string
): Promise<void> {
    const pair = zen._?.sea;
    return new Promise((resolve, reject) => {
        zen
            .get(STEALTH_ANNOUNCEMENTS)
            .get(id)
            .put(null as any, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            }, pair ? { authenticator: pair } : {});
    });
}
