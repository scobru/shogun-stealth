import { ethers } from "ethers";
import {
    getRegistryContract,
    getPaymentForwarderContract,
} from "./contracts";
import { StealthAnnouncement, StealthKeys } from "./stealthCore";

/**
 * Register stealth keys on Shogun StealthKeyRegistry.
 */
export async function registerOnChain(
    registryAddress: string,
    signer: ethers.Signer,
    keys: StealthKeys
): Promise<string> {
    const registry = getRegistryContract(registryAddress, signer);

    // Shogun StealthKeyRegistry uses strings for public keys.
    // We pass them as 0x-prefixed hex strings.
    const tx = await registry.registerStealthKeys(
        keys.viewing.pub,
        keys.spending.pub
    );
    await tx.wait();
    return tx.hash;
}

/**
 * Register stealth keys on behalf of another address (Neural Identity) using its signature.
 * MetaMask (signer) pays the gas fee.
 */
export async function registerOnChainOnBehalf(
    registryAddress: string,
    gasSigner: ethers.Signer,
    neuralPriv: string,
    keys: StealthKeys
): Promise<string> {
    const registry = getRegistryContract(registryAddress, gasSigner);
    const neuralWallet = new ethers.Wallet(neuralPriv);
    const registrant = neuralWallet.address;

    // 1. Prepare EIP-712 Signature
    const network = await (gasSigner.provider as ethers.Provider).getNetwork();
    const chainId = network.chainId;

    const domain = {
        name: "Shogun Stealth Key Registry",
        version: "1",
        chainId: chainId,
        verifyingContract: await registry.getAddress(),
    };

    const types = {
        StealthKeys: [
            { name: "viewingPublicKey", type: "string" },
            { name: "spendingPublicKey", type: "string" },
        ],
    };

    const value = {
        viewingPublicKey: keys.viewing.pub,
        spendingPublicKey: keys.spending.pub,
    };

    // Sign the typed data with the Neural Identity private key
    const signature = await neuralWallet.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    // 2. Execute on-chain via MetaMask (gasSigner)
    const tx = await registry.registerStealthKeysOnBehalf(
        registrant,
        keys.viewing.pub,
        keys.spending.pub,
        sig.v,
        sig.r,
        sig.s
    );

    await tx.wait();
    return tx.hash;
}


/**
 * Send ETH and announce payment to a stealth address using PaymentForwarder.
 */
export async function sendEthOnChain(
    forwarderAddress: string,
    signer: ethers.Signer,
    params: {
        receiver: string;
        ephemeralPubKey: string;
        viewTag: string;
        amount: string;
    }
): Promise<string> {
    const forwarder = getPaymentForwarderContract(forwarderAddress, signer);

    // 1. Get current toll from contract
    const toll = await forwarder.toll();

    // 2. Extract pkx (x-coordinate) from compressed ephemeral public key
    // A compressed pubkey is 0x<byte><32-bytes-x>
    let pkx = params.ephemeralPubKey;
    if (pkx.startsWith("0x")) pkx = pkx.slice(2);
    if (pkx.length === 66) {
        pkx = "0x" + pkx.slice(2); // Keep only the 32 bytes of X
    } else {
        throw new Error("Invalid ephemeral public key format for pkx extraction");
    }

    // 3. Prepare ciphertext (viewTag placeholder + padding)
    // SHIP-03: ciphertext is often used for encrypted metadata, but we'll use it for the viewTag
    const ciphertext = ethers.zeroPadValue(params.viewTag, 32);

    // 4. Send transaction
    const totalValue = ethers.parseEther(params.amount) + toll;

    const tx = await forwarder.sendEth(
        params.receiver,
        toll,
        pkx,
        ciphertext,
        { value: totalValue }
    );

    await tx.wait();
    return tx.hash;
}

/**
 * Fetch announcements from both StealthKeyRegistry (Metadata) and PaymentForwarder.
 */
export async function fetchOnChainAnnouncements(
    registryAddress: string,
    forwarderAddress: string,
    provider: ethers.Provider,
    fromBlock: number | string = "earliest"
): Promise<StealthAnnouncement[]> {
    const registry = getRegistryContract(registryAddress, provider);
    const forwarder = getPaymentForwarderContract(forwarderAddress, provider);

    const announcements: StealthAnnouncement[] = [];

    // 1. Fetch from StealthKeyRegistry (Generic Metadata)
    const metaFilter = registry.filters.StealthMetadataRegistered();
    const metaLogs = await registry.queryFilter(metaFilter, fromBlock);

    for (const log of metaLogs) {
        const [stealthAddress, _sender, ephemeralPubKey, viewTag, recipientPubKey] = (log as any).args;
        announcements.push({
            id: `chain-meta-${log.transactionHash}-${log.index}`,
            stealthAddress,
            ephemeralPubKey,
            viewTag,
            metadata: recipientPubKey,
            timestamp: 0,
        });
    }

    // 2. Fetch from PaymentForwarder (Payment Announcements)
    const payFilter = forwarder.filters.Announcement();
    const payLogs = await forwarder.queryFilter(payFilter, fromBlock);

    for (const log of payLogs) {
        const [receiver, _amount, _token, pkx, ciphertext] = (log as any).args;

        // pkx is bytes32 (X coordinate). For Umbra-style scanning, 
        // we often assume a prefix (0x02 or 0x03) or just use X if the library allows.
        // For now, we'll store pkx as is.

        // Ciphertext usually contains the viewTag in the first bytes
        const viewTag = ciphertext.slice(0, 4); // First 1 byte (0x + 2 chars)

        announcements.push({
            id: `chain-pay-${log.transactionHash}-${log.index}`,
            stealthAddress: receiver,
            ephemeralPubKey: pkx,
            viewTag: viewTag,
            metadata: ciphertext,
            timestamp: 0,
        });
    }

    return announcements;
}

/**
 * Check if a user is registered on-chain.
 */
export async function getOnChainStealthKeys(
    registryAddress: string,
    provider: ethers.Provider,
    address: string
): Promise<{ viewing: string; spending: string } | null> {
    const registry = getRegistryContract(registryAddress, provider);
    try {
        const [viewing, spending] = await registry.getStealthKeys(address);
        if (!viewing || viewing === "" || viewing === "0x") return null;
        return { viewing, spending };
    } catch {
        return null;
    }
}
