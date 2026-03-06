
import { describe, it, expect } from 'vitest';
import { ethers } from "ethers";
import { scanAnnouncements, deriveStealthKeysFromGun, StealthAnnouncement } from "./stealthCore";

describe('Stealth Scanning Benchmark', () => {
  it('measures scanning performance', async () => {
    // 1. Generate a user "SEA" key (mock)
    const mockSeaEpriv = "mock-sea-epriv-key-1234567890";
    const keys = deriveStealthKeysFromGun(mockSeaEpriv);

    // 2. Generate announcements
    const numAnnouncements = 10; // Reduced to 10 for quick CI
    const announcements: StealthAnnouncement[] = [];

    // Add a matching announcement
    const { generateStealthAddress } = await import("./stealthCore");
    const matching = generateStealthAddress(keys.spending.pub, keys.viewing.pub);
    announcements.push({
        id: "ann-match",
        ephemeralPubKey: matching.ephemeralPubKey,
        stealthAddress: matching.stealthAddress,
        viewTag: "", // Force slow path even for match
        timestamp: Date.now(),
    });

    console.log(`Generating ${numAnnouncements} dummy announcements...`);

    for (let i = 0; i < numAnnouncements; i++) {
        const randomWallet = ethers.Wallet.createRandom();
        const compressedKey = ethers.SigningKey.computePublicKey(randomWallet.signingKey.publicKey, true);
        announcements.push({
            id: `ann-${i}`,
            ephemeralPubKey: compressedKey,
            stealthAddress: randomWallet.address,
            viewTag: "", // FORCE SLOW PATH (no tag)
            timestamp: Date.now(),
        });
    }

    // 3. Measure time to scan
    console.log("Starting scan (no viewTag)...");
    const start = performance.now();

    const owned = await scanAnnouncements(announcements, keys);

    const end = performance.now();
    const duration = end - start;

    console.log(`Scanned ${announcements.length} announcements in ${duration.toFixed(2)}ms`);
    console.log(`Average time per announcement: ${(duration / announcements.length).toFixed(2)}ms`);

    expect(owned.length).toBe(1);
    expect(owned[0].stealthAddress).toBe(matching.stealthAddress);

  }, 30000); // 30s timeout
});
