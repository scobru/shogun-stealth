# 🕳️ NULL ROUTE

**Null Route** is a premium, high-performance, and privacy-preserving payment dashboard. It implements **non-interactive stealth addresses** (ERC-5564) to enable private Ethereum transactions using decentralized identity mapping.

---

## ⚡ Zen-Native Architecture

Unlike traditional stealth implementations, **Null Route** is built natively on **Zen**. It leverages decentralized identity protocols to derive cryptographic primitives directly from your identity.

- **Deterministic Derivation**: Stealth viewing and spending keys are derived from your Zen encryption keys.
- **P2P Announcements**: Transaction metadata is propagated through the Zen graph, eliminating the need for centralized indexers or on-chain event bloat for coordination.
- **Unified Identity**: Your "Stealth Meta-Address" is tied to your Zen handle, making private payments as easy as sending to a username.

---

## 🌟 Key Features

- 🔐 **Standard Compliant**: Full adherence to decentralized identity protocols for cross-app interoperability.
- 🕵️ **Fluidkey Integration**: Powering robust cryptographic derivation and SECP256K1 stealth address generation.
- 🔗 **Zero-Knowledge Identity**: Senders generate unique, one-time addresses without recipient interaction.
- 📡 **Decentralized Discovery**: Stealth announcements are broadcasted over Zen relays.
- 🏎️ **Optimized Scanning**: Implements **View Tags** for ultra-fast discovery of owned stealth addresses.
- 📱 **Premium UI**: A glassmorphic, high-interaction dashboard built with Tailwind CSS 4 and DaisyUI 5.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Core Framework** | [React 19](https://react.dev/) |
| **Identity/P2P** | [Zen (Native)](https://github.com/scobru/zen) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/) |
| **Blockchain** | [Ethers v6](https://docs.ethers.org/v6/) |
| **Cryptography** | [@fluidkey/stealth-account-kit](https://github.com/fluidkey/stealth-account-kit) |
| **Build Tool** | [Vite 5](https://vitejs.dev/) |

---

## 🏗️ Project Structure

```text
null-route/
├── src/
│   ├── zen/                # ZEN NATIVE: Custom DB wrapper & crypto primitives
│   │   ├── db.ts           # Session management & Zen graph interactions
│   │   └── crypto.ts       # Identity-based key derivation
│   ├── lib/
│   │   ├── stealthCore.ts  # Identity derivation logic
│   │   ├── gunStealth.ts   # Coordination layer for Zen announcements
│   │   └── networks.ts     # Multi-network configuration (Base Mainnet/Sepolia)
│   ├── components/
│   │   ├── StealthDashboard.tsx    # Main interaction hub
│   │   ├── AuthPage.tsx            # Zen-native authentication flow
│   │   └── ...                     # Specialized stealth components
│   └── App.tsx             # Protocol initialization & routing
├── index.html              # Entry point with wallet conflict protection
└── vite.config.ts          # Vite config with Node.js polyfills
```

---

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/scobru/null-route.git
cd null-route

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`.

---

## ⚙️ Configuration

The application is optimized for the **Base Ecosystem**.

| Variable | Description | Default (Sepolia) |
|----------|-------------|-------------------|
| `VITE_SEPOLIA_REGISTRY_ADDRESS` | ERC-5564 Registry | `0xCF642...Cb55` |
| `VITE_SEPOLIA_FORWARDER_ADDRESS` | Payment Forwarder | `0xDF64f...903B1` |
| `VITE_MAINNET_REGISTRY_ADDRESS` | Production Registry | `0x9aD8B...29F2C` |

---

## 🛡️ Security & Standards

- **Standardization**: Follows **ERC-5564** for stealth addresses and modern identity protocols.
- **Privacy**: Zero linkage between your public address and stealth transactions.
- **Sovereignty**: Your keys never leave your browser; all derivation happens locally.

