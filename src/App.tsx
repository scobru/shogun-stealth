import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  ShogunButtonProvider,
  ShogunButton,
  useShogun,
} from "shogun-button-react";
import { shogunConnector } from "shogun-button-react";
import type { ShogunCore } from "shogun-core";
import Gun from "gun";
import "gun/sea";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { NetworkSelector } from "./components/NetworkSelector";
import { NetworkProvider } from "./lib/NetworkContext";
import StealthDashboard from "./components/StealthDashboard";
import logo from "/logo.svg";

import "./index.css";
import "shogun-relays";

// Extend window interface for ShogunRelays
declare global {
  interface Window {
    ShogunRelays: {
      forceListUpdate: () => Promise<string[]>;
    };
    shogunDebug?: {
      clearAllData: () => void;
      sdk: ShogunCore;
      gun: any;
      relays: string[];
    };
    gun?: any;
    shogun?: ShogunCore;
  }
}

// Main component that uses the auth context
const MainApp: React.FC = () => {
  const { isLoggedIn } = useShogun();

  return (
    <div className="app-shell">
      <header className="navbar-custom">
        <div className="navbar-inner">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Shogun Stealth" className="w-14 h-14" />
            <div className="flex flex-col">
              <span className="font-heading text-3xl font-bold tracking-tight text-primary">
                Shogun Stealth
              </span>
              <p className="text-[9px] font-bold text-base-content/40 uppercase tracking-[0.4em]">
                Private Stealth Transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`badge-custom ${isLoggedIn ? "!bg-success/20 !text-success" : "!bg-error/20 !text-error"}`}
            >
              <span className="badge-dot" />
              <span className="font-bold text-[10px] tracking-widest">
                {isLoggedIn ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <NetworkSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Stealth Dashboard */}
        <StealthDashboard />
      </main>

      <footer className="w-full py-16 px-6 mt-auto bg-base-200/50 border-t border-primary/5">
        <div className="max-w-1040 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.15em] opacity-40">
              <a
                href="https://github.com/scobru/shogun-stealth"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                Repo
              </a>
              <a
                href="https://t.me/shogun_eco"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                Network
              </a>
              <a
                href="https://sepolia.basescan.org/address/0x6038197D7eb76ee668b37c61021619542F757B63"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors decoration-dotted underline underline-offset-4"
              >
                Registry
              </a>
              <a
                href="https://sepolia.basescan.org/address/0x512edE537cb53dcbFC29629B4999c3e8f18799Eb"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors decoration-dotted underline underline-offset-4"
              >
                Forwarder
              </a>
              <a
                href="https://shogun-eco.xyz/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                Ecosystem
              </a>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px w-12 bg-primary/10 hidden md:block" />
              <span className="text-[10px] font-medium opacity-30">
                Created with ❤️ by the Shogun Community
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ShogunAppProps {
  shogun: ShogunCore;
  options: any;
}

function ShogunApp({ shogun, options }: ShogunAppProps) {
  const handleLoginSuccess = useCallback((result: any) => {
    console.log("Login success:", result);
  }, []);

  const handleError = useCallback((error: string | Error) => {
    console.error("Auth error:", error);
  }, []);

  return (
    <Router>
      <NetworkProvider>
        <ShogunButtonProvider
          core={shogun}
          options={options}
          onLoginSuccess={handleLoginSuccess}
          onSignupSuccess={handleLoginSuccess}
          onError={handleError}
        >
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ShogunButtonProvider>
      </NetworkProvider>
    </Router>
  );
}

function App() {
  const [shogunData, setShogunData] = useState<{
    core: ShogunCore;
    options: any;
  } | null>(null);
  const [relays, setRelays] = useState<string[]>([]);
  const [isLoadingRelays, setIsLoadingRelays] = useState(true);

  // First effect: fetch relays asynchronously
  useEffect(() => {
    async function fetchRelays() {
      try {
        setIsLoadingRelays(true);
        const fetchedRelays = await window.ShogunRelays.forceListUpdate();

        console.log("Fetched relays:", fetchedRelays);

        const peersToUse =
          fetchedRelays && fetchedRelays.length > 0
            ? fetchedRelays
            : ["https://shogun-relay.scobrudot.dev/gun"];

        setRelays(peersToUse);
      } catch (error) {
        console.error("Error fetching relays:", error);
        setRelays(["https://peer.wallie.io/gun"]);
      } finally {
        setIsLoadingRelays(false);
      }
    }

    fetchRelays();
  }, []);

  // Second effect: initialize ShogunCore only after relays are loaded
  useEffect(() => {
    if (isLoadingRelays || relays.length === 0) {
      return;
    }

    const initShogun = async () => {
      const gun = Gun({
        peers: relays,
        localStorage: false,
        radisk: false,
        wire: true,
        axe: true,
      });

      const result = await shogunConnector({
        appName: "Shogun Stealth",
        gunInstance: gun,
        web3: { enabled: true },
        webauthn: {
          enabled: true,
          rpName: "Shogun Stealth",
        },
        nostr: { enabled: true },
        zkproof: { enabled: true },
        showWebauthn: true,
        showNostr: true,
        showMetamask: true,
        showZkProof: true,
        enableGunDebug: import.meta.env.DEV,
        enableConnectionMonitoring: true,
        defaultPageSize: 20,
        connectionTimeout: 10000,
        debounceInterval: 100,
      });

      const { core: shogunCore } = result;

      if (import.meta.env.DEV && typeof window !== "undefined") {
        setTimeout(() => {
          window.shogunDebug = {
            clearAllData: () => {
              if (shogunCore.storage) {
                shogunCore.storage.clearAll();
              }
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.removeItem("gunSessionData");
              }
            },
            sdk: shogunCore,
            gun: shogunCore.gun,
            relays: relays,
          };

          window.gun = shogunCore.gun;
          window.shogun = shogunCore;
        }, 1000);
      }

      setShogunData({ core: shogunCore, options: result.options });
    };

    initShogun();
  }, [relays, isLoadingRelays]);

  if (isLoadingRelays || !shogunData) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <span className="loading loading-lg"></span>
        <p className="text-secondary">
          {isLoadingRelays ? "Loading relays..." : "Initializing Shogun..."}
        </p>
      </div>
    );
  }

  return <ShogunApp shogun={shogunData.core} options={shogunData.options} />;
}

export default App;
