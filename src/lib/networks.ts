export interface NetworkConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
    registryAddress: string;
    forwarderAddress: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
    "base-sepolia": {
        name: "Base Sepolia",
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        registryAddress: "0x6038197D7eb76ee668b37c61021619542F757B63",
        forwarderAddress: "0x512edE537cb53dcbFC29629B4999c3e8f18799Eb",
    },
    "base-mainnet": {
        name: "Base Mainnet",
        chainId: 8453,
        rpcUrl: "https://mainnet.base.org",
        explorerUrl: "https://basescan.org",
        registryAddress: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
        forwarderAddress: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
    },
};

export const DEFAULT_NETWORK = "base-sepolia";
