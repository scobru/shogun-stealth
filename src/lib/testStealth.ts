import {
    generateStealthKeysFromSeed,
    generateStealthAddress,
    checkStealthAddress,
    deriveStealthPrivKey
} from "./stealthCore";

async function testStealth() {
    console.log("🚀 Starting Stealth 2-Key Test...");

    // 1. Receiver Setup
    const seed = new Uint8Array(32).fill(1);
    const receiverKeys = generateStealthKeysFromSeed(seed);
    console.log("✅ Receiver Keys generated");

    // 2. Sender computes Stealth Address
    const { stealthAddress, ephemeralPubKey } = generateStealthAddress(
        receiverKeys.spending.pub,
        receiverKeys.viewing.pub
    );
    console.log("✅ Stealth Address generated:", stealthAddress);
    console.log("✅ Ephemeral Pub Key:", ephemeralPubKey);

    // 3. Receiver Scans
    const isMine = checkStealthAddress(
        ephemeralPubKey,
        receiverKeys.viewing.priv,
        receiverKeys.spending.pub,
        stealthAddress
    );
    console.log("🔍 Scanning result:", isMine ? "MATCHED (Success)" : "FAILED");

    // 4. Receiver Derives Private Key
    const privKey = deriveStealthPrivKey(
        ephemeralPubKey,
        receiverKeys.viewing.priv,
        receiverKeys.spending.priv
    );
    console.log("🔑 Derived Private Key:", privKey);

    // 5. Verify Address of Derived Private Key matches Stealth Address
    // (Importing ethers would be needed here for full verification in a real test file)
}

testStealth().catch(console.error);
