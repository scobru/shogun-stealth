/**
 * Gun Stealth - GunDB integration for 2nd Gen Stealth Transactions (Dual Key)
 *
 * Uses GunDB as a decentralized backend for:
 * - Stealth Registry: pub → {spendingPubKey, viewingPubKey}
 * - Announcements: list of {ephemeralPubKey, stealthAddress} records
 */

import type { IGunInstance } from "gun";
import type { StealthAnnouncement, StealthKeys } from "./stealthCore";

const STEALTH_REGISTRY = "shogun/stealth/registry/v2"; // Bumped version for 2-key model
const STEALTH_ANNOUNCEMENTS = "shogun/stealth/announcements/v2";

export interface StealthRegistryEntry {
    spendingPubKey: string; // S
    viewingPubKey: string;  // V
    pub: string;            // GunDB user public key
    alias?: string;         // Optional human-readable alias
    updatedAt: number;
}

/**
 * Publish your dual stealth public keys to the public Gun registry.
 */
export async function publishStealthKeys(
    gun: IGunInstance<any>,
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

        gun
            .get(STEALTH_REGISTRY)
            .get(pub)
            .put(entry as any, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
    });
}

/**
 * Look up a user's dual stealth keys by their GunDB public key.
 */
export async function getStealthKeys(
    gun: IGunInstance<any>,
    targetPub: string
): Promise<StealthRegistryEntry | null> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 5000);

        gun
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
    gun: IGunInstance<any>
): Promise<StealthRegistryEntry[]> {
    return new Promise((resolve) => {
        const results: StealthRegistryEntry[] = [];
        const timeout = setTimeout(() => resolve(results), 5000);

        gun
            .get(STEALTH_REGISTRY)
            .map()
            .once((data: StealthRegistryEntry | null) => {
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
 * Publish a stealth announcement to Gun.
 */
export async function publishAnnouncement(
    gun: IGunInstance<any>,
    announcement: Omit<StealthAnnouncement, "id" | "timestamp">
): Promise<string> {
    const id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const full: StealthAnnouncement = {
        ...announcement,
        id,
        timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
        gun
            .get(STEALTH_ANNOUNCEMENTS)
            .get(id)
            .put(full as any, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve(id);
            });
    });
}

/**
 * Subscribe to real-time stealth announcements from Gun.
 */
export function subscribeToAnnouncements(
    gun: IGunInstance<any>,
    onAnnouncement: (announcement: StealthAnnouncement) => void
): () => void {
    const ref = gun
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
 * Get all past announcements from Gun.
 */
export async function getAllAnnouncements(
    gun: IGunInstance<any>
): Promise<StealthAnnouncement[]> {
    return new Promise((resolve) => {
        const results: StealthAnnouncement[] = [];
        const timeout = setTimeout(() => resolve(results), 5000);

        gun
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
 * Delete (nullify) an announcement from Gun.
 */
export async function deleteAnnouncement(
    gun: IGunInstance<any>,
    id: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        gun
            .get(STEALTH_ANNOUNCEMENTS)
            .get(id)
            .put(null as any, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
    });
}
