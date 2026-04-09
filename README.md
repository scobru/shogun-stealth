# 🥷 Shogun Stealth

A high-performance, privacy-preserving payment dashboard built on the Shogun ecosystem. Shogun Stealth implements **non-interactive stealth addresses** (ERC-5564 inspired) to enable private Ethereum transactions using decentralized identity mapping.

## 🌟 Key Features

- 🔐 **SHIP-03 Compliant**: Uses the Shogun Identity Protocol (SHIP-03) to derive stealth keys from GunDB SEA identities.
- 🕵️ **Fluidkey Integration**: Built with the Fluidkey Stealth Account Kit for robust cryptographic derivation and address generation.
- 🔗 **Zero-Knowledge Identity**: Senders can generate a unique, one-time Ethereum address for a recipient without the recipient being online.
- 📡 **Decentralized Announcements**: Stealth transaction metadata is announced via GunDB, allowing receivers to scan for incoming funds privately.
- 🏎️ **Optimized Scanning**: Implements **View Tags** to speed up the discovery of owned stealth addresses by 99%.
- 📱 **Modern Dashboard**: A premium, glassmorphic UI for registering stealth keys, sending private payments, and managing "cells" (owned stealth addresses).

---

## 🚀 How it Works

1. **Identity Mapping**: Your GunDB `epriv` (encryption private key) is used to deterministically derive two Ethereum key pairs: a **Viewing Key** and a **Spending Key**.
2. **Registration**: You publish your **Stealth Meta-Address** (composed of your public viewing and spending keys) to the decentralized Shogun registry.
3. **Sending**: A sender takes your meta-address and an ephemeral key to derive a unique **Stealth Address** (P) that only you can unlock.
4. **Announcement**: The sender announces the payment on GunDB with an encrypted ephemeral public key and a **View Tag**.
5. **Scanning**: You scan the GunDB announcement graph. The **View Tag** allows you to quickly skip announcements that aren't yours. If a tag matches, you use your private **Viewing Key** to confirm ownership and your **Spending Key** to derive the private key for the funds.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js ≥ 20.0.0
- A Web3 Wallet (Metamask, etc.) for on-chain interactions.

### Installation

```bash
# Clone the repository
cd shogun-stealth

# Install dependencies
yarn install
```

### Development

```bash
# Start development server
yarn dev
```

The application will be available at `http://localhost:8080`.

---

## 🏗️ Project Structure

```text
shogun-stealth/
├── src/
│   ├── lib/
│   │   ├── stealthCore.ts     # CORE LOGIC: SHIP-03 derivation & Fluidkey integration
│   │   ├── gunStealth.ts      # GunDB coordination and announcements
│   │   └── NetworkContext.tsx # Ethereum network state management
│   ├── components/
│   │   ├── StealthDashboard.tsx    # Main App Logic
│   │   ├── RegisterStealth.tsx     # Stealth Key Publication
│   │   ├── SendStealth.tsx         # Stealth Address Generation & Sending
│   │   └── ScanAnnouncements.tsx   # P2P Discovery & Private Key Recovery
│   └── App.tsx                # Shogun SDK initialization
├── index.html                 # App entry with wallet conflict protection
└── vite.config.ts             # Vite configuration with node polyfills
```

---

## ⚙️ Configuration

The application supports **Base Mainnet** and **Base Sepolia**.

| Variable | Description |
|----------|-------------|
| `VITE_SEPOLIA_REGISTRY_ADDRESS` | The contract address for the stealth registry on Sepolia. |
| `VITE_SEPOLIA_FORWARDER_ADDRESS` | The contract address for the payment forwarder on Sepolia. |
| `VITE_MAINNET_REGISTRY_ADDRESS` | (Optional) Production registry address. |

---

## 🛡️ Security & Standards

- **Standardization**: Follows the **SHIP-03** specification for Shogun-wide identity interoperability.
- **Privacy**: No linkage between your public ENS/Ethereum address and your stealth transactions on-chain.
- **Decentralization**: All coordination happens over GunDB, removing reliance on centralized indexers or servers.

---

## 🤝 Shogun Network

This tool is part of the Shogun ecosystem:
- **[shogun-auth](../shogun-auth)**: Unified identity and vault management.
- **[shogun-wormhole](../shogun-wormhole)**: Secure P2P file transfers.

---

Built with ❤️ by [scobru](https://github.com/scobru).  
*Enabling financial privacy in the decentralized era.*
