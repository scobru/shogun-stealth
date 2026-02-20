# 🥷 Stealth Address Derivation Logic

The Shogun ecosystem implements a unique stealth address system that bridges decentralized identity (GunDB) with Ethereum privacy.

## Conceptual Overview

The core innovation is using **GunDB SEA (Security, Encryption, Authorization)** keys as the seed for Ethereum wallets.

### 1. Key Mapping

A GunDB user has a SEA pair consisting of `pub`, `priv`, `epub`, and `epriv`.
In Shogun:

- `epriv` (SEA Encryption Private Key) is a 32-byte scalar.
- We treat this scalar directly as an **Ethereum Private Key**.
- This creates an "Identity Address" — an Ethereum address that represents your GunDB persona on-chain.

### 2. Stealth Flow (ECDH)

To send funds privately:

1.  **Recipient** publishes their `epub` (Stealth Meta-Address) to the registry on GunDB.
2.  **Sender** generates an **Ephemeral SEA Pair**.
3.  **Shared Secret**: The sender computes a shared secret using their ephemeral `epriv` and the receiver's `epub` via **ECDH**.
    ```typescript
    const sharedSecret = await SEA.secret(receiverEpub, ephemeralPair);
    ```
4.  **Deterministic Derivation**: A new 32-byte scalar is derived from the `sharedSecret` + `nonce`.
5.  **Stealth Address**: This derived scalar is used as the private key for a one-time Ethereum address.
6.  **Announcement**: The sender publishes the `{ephemeralEpub, stealthAddress, nonce}` on GunDB.

### 3. Scanning and Discovery

The recipient constantly listens for new announcements:

1.  For each announcement, they compute the `sharedSecret` using their own `epriv` and the `ephemeralEpub` from the announcement.
2.  They derive the address using the same deterministic logic.
3.  If the derived address matches the `stealthAddress` in the announcement, the funds belong to them.

## Technical Implementation

The logic is contained within `src/lib/stealthCore.ts`.

### Scalar Conversion

Since SEA `epriv` is base64url encoded, we first convert it back to a raw hex scalar for Ethers.js:

```typescript
export function seaPrivToEthPriv(seaPrivBase64url: string): string {
  // base64url -> base64 -> binary -> hex
  // ...
  return "0x" + hex;
}
```

### Derivation

```typescript
const derivedPair = await SEA.pair(null, { seed: sharedSecret + nonce });
const ethPrivKey = seaPrivToEthPriv(derivedPair.epriv);
const stealthWallet = new ethers.Wallet(ethPrivKey);
```

## Security Considerations

- **Pair Freshness**: Senders **must** use a fresh ephemeral pair for every transaction to prevent leakages.
- **Standard Alignment**: This method differs from the Umbra Protocol (which uses secp256k1 keys directly) by leveraging the pre-existing P-256 keys of the GunDB ecosystem, simplifying the user experience for social/decentralized apps.
