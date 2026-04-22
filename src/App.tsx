import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ZEN from "zen";
import { DataBase } from "./zen/db";

// Components
import AuthPage from "./components/AuthPage";
import StealthDashboard from "./components/StealthDashboard";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { NetworkSelector } from "./components/NetworkSelector";
import { NetworkProvider, useNetwork } from "./lib/NetworkContext";
import logo from "/logo.svg";

import "./index.css";

// --- Auth Context ---
interface AuthContextType {
  db: DataBase;
  isLoggedIn: boolean;
  userPub: string | null;
  username: string;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Main App Layout ---
const MainApp: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const { currentNetwork } = useNetwork();

  return (
    <div className="app-shell">
      <header className="navbar-custom">
        <div className="navbar-inner">
          <div className="flex items-center gap-4">
            <img src={logo} alt="NULL ROUTE" className="w-10 h-10 md:w-14 md:h-14" />
            <div className="flex flex-col">
              <span className="font-heading text-xl md:text-3xl font-bold tracking-tight text-primary">
                NULL ROUTE
              </span>
              <p className="hidden md:block text-[9px] font-bold text-base-content/40 uppercase tracking-[0.4em]">
                Private Stealth Transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`badge-custom ${isLoggedIn ? "!bg-success/20 !text-success" : "!bg-error/20 !text-error"}`}
            >
              <span className="badge-dot" />
              <span className="hidden md:inline font-bold text-[10px] tracking-widest">
                {isLoggedIn ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <NetworkSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-main">
        <StealthDashboard />
      </main>

      <footer className="w-full py-16 px-6 mt-auto bg-base-200/50 border-t border-primary/5">
        <div className="max-w-1040 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.15em] opacity-40">
              <a href="https://github.com/scobru/null-route" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Repo
              </a>
              <a href="https://t.me/shogun_eco" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Network
              </a>
              <a href={`${currentNetwork.explorerUrl}/address/${currentNetwork.registryAddress}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors decoration-dotted underline underline-offset-4">
                Registry
              </a>
              <a href="https://shogun-eco.xyz/" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Portal
              </a>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px w-12 bg-primary/10 hidden md:block" />
              <span className="text-[10px] font-medium opacity-30">
                Created with ❤️ by the Null Route Community
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Root App ---
function App() {
  const [initializing, setInitializing] = useState(true);
  const [dbInstance, setDbInstance] = useState<DataBase | null>(null);
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    userPub: null as string | null,
    username: "",
  });

  useEffect(() => {
    const initZen = async () => {
      try {
        const relays = ["https://shogun-relay.scobrudot.dev/zen"];
        const zen = new ZEN({
          peers: relays,
          localStorage: false,
          radisk: false,
        });
        const db = new DataBase(zen);
        setDbInstance(db);

        const restored = await db.restoreSession();
        if (restored.success) {
          setAuthState({
            isLoggedIn: true,
            userPub: db.getUserPub(),
            username: restored.username || "",
          });
        }
      } catch (err) {
        console.error("Zen Init Failed", err);
      } finally {
        setInitializing(false);
      }
    };
    initZen();
  }, []);

  const handleLogout = useCallback(() => {
    if (dbInstance) {
      dbInstance.logout();
      setAuthState({ isLoggedIn: false, userPub: null, username: "" });
    }
  }, [dbInstance]);

  const handleAuthSuccess = (username: string) => {
    if (dbInstance) {
      setAuthState({
        isLoggedIn: true,
        userPub: dbInstance.getUserPub(),
        username: username,
      });
    }
  };

  if (initializing || !dbInstance) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">
          Bootstrapping Stealth Protocol
        </p>
      </div>
    );
  }

  return (
    <Router>
      <NetworkProvider>
        <AuthContext.Provider value={{
          db: dbInstance,
          ...authState,
          logout: handleLogout
        }}>
          {!authState.isLoggedIn ? (
            <AuthPage db={dbInstance} onAuth={handleAuthSuccess} />
          ) : (
            <Routes>
              <Route path="/" element={<MainApp />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </AuthContext.Provider>
      </NetworkProvider>
    </Router>
  );
}

export default App;
