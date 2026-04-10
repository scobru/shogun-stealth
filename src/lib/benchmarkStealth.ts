
import { ethers } from "ethers";
import {
    generateStealthAddress,
    checkStealthAddress,
    scanAnnouncements,
    deriveStealthKeysFromGun,
    StealthAnnouncement,
    StealthKeys
} from "./stealthCore";
import { performance } from "perf_hooks";

async function runBenchmark() {
    console.log("Starting benchmark...");

    const seaEpriv = "benchmarking-secret-123";
    const keys = await deriveStealthKeysFromGun(seaEpriv);

    const numAnnouncements = 100;
    const announcements: StealthAnnouncement[] = [];

    // Generate some announcements, some for us, some not.
    for (let i = 0; i < numAnnouncements; i++) {
        const isForMe = i % 10 === 0;
        let spendingPub = keys.spending.pub;
        let viewingPub = keys.viewing.pub;

        if (!isForMe) {
            const otherWallet = ethers.Wallet.createRandom();
            spendingPub = otherWallet.signingKey.publicKey;
            viewingPub = otherWallet.signingKey.publicKey;
        }

        const { stealthAddress, ephemeralPubKey, viewTag } = generateStealthAddress(
            spendingPub,
            viewingPub
        );

        announcements.push({
            id: `ann-${i}`,
            ephemeralPubKey,
            stealthAddress,
            viewTag,
            timestamp: Date.now()
        });
    }

    console.log(`Generated ${numAnnouncements} announcements (${numAnnouncements/10} for us).`);

    // Warm up
    scanAnnouncements(announcements.slice(0, 10), keys);

    const start = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
        scanAnnouncements(announcements, keys);
    }
    const end = performance.now();

    const avgTime = (end - start) / iterations;
    console.log(`Average scan time over ${iterations} iterations: ${avgTime.toFixed(2)}ms`);
    console.log(`Time per announcement: ${(avgTime / numAnnouncements).toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
