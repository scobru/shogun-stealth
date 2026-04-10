export interface NetworkConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
    registryAddress: string;
    forwarderAddress: string;
    gasPriceOracle?: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
    "base-sepolia": {
        name: "Base Sepolia",
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        registryAddress:
            import.meta.env.VITE_SEPOLIA_REGISTRY_ADDRESS ||
            "0xCF6429c227F1a2912Bcb98405CAa8b436c18Cb55",
        forwarderAddress:
            import.meta.env.VITE_SEPOLIA_FORWARDER_ADDRESS ||
            "0xDF64fFB593AE0bEA06F35AD80d5097E18ee903B1",
        gasPriceOracle: "0x420000000000000000000000000000000000000F",
    },
    "base-mainnet": {
        name: "Base Mainnet",
        chainId: 8453,
        rpcUrl: "https://mainnet.base.org",
        explorerUrl: "https://basescan.org",
        registryAddress:
            import.meta.env.VITE_MAINNET_REGISTRY_ADDRESS ||
            "0x9aD8B62765C528c168d704b89e50069876a29F2C",
        forwarderAddress:
            import.meta.env.VITE_MAINNET_FORWARDER_ADDRESS ||
            "0x0bE89b593A6eF044B25802195C634559a7FcBbdF",
        gasPriceOracle: "0x420000000000000000000000000000000000000F",
    },
};

export const DEFAULT_NETWORK = "base-sepolia";
