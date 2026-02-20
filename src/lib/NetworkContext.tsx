import React, { createContext, useContext, useState, useEffect } from "react";
import { NetworkConfig, NETWORKS, DEFAULT_NETWORK } from "./networks";

interface NetworkContextType {
  currentNetwork: NetworkConfig;
  networkKey: string;
  setNetwork: (key: string) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [networkKey, setNetworkKey] = useState<string>(() => {
    return localStorage.getItem("shogun-stealth-network") || DEFAULT_NETWORK;
  });

  const currentNetwork = NETWORKS[networkKey] || NETWORKS[DEFAULT_NETWORK];

  useEffect(() => {
    localStorage.setItem("shogun-stealth-network", networkKey);
  }, [networkKey]);

  return (
    <NetworkContext.Provider
      value={{ currentNetwork, networkKey, setNetwork: setNetworkKey }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};
