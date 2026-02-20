/**
 * StealthDashboard - Main entry point for Shogun Stealth
 * A tab-based dashboard: Register | Send | Scan
 */

import React, { useState } from "react";
import { useShogun } from "shogun-button-react";
import { ShogunButton } from "shogun-button-react";
import RegisterStealth from "./RegisterStealth";
import SendStealth from "./SendStealth";
import ScanAnnouncements from "./ScanAnnouncements";

type Tab = "register" | "send" | "scan";

const tabs: { id: Tab; label: string; icon: string; desc: string }[] = [
  {
    id: "register",
    label: "My Stealth Keys",
    icon: "🧬",
    desc: "Generate and publish your Dual Stealth Public Keys (Spending & Viewing).",
  },
  {
    id: "send",
    label: "Send",
    icon: "📤",
    desc: "Generate a one-time stealth address for a recipient and announce on Gun.",
  },
  {
    id: "scan",
    label: "Scan & Receive",
    icon: "🔍",
    desc: "Scan Gun announcements using your viewing key to discover stealth funds.",
  },
];

export const StealthDashboard: React.FC = () => {
  const { isLoggedIn } = useShogun();
  const [activeTab, setActiveTab] = useState<Tab>("register");

  const activeTabInfo = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="surface-container-high p-8 md:p-14 text-center relative overflow-hidden flex flex-col items-center">
        <div className="hero-badge">Next Gen Privacy</div>
        <h1 className="hero-title">
          Shogun <span className="text-primary italic">Stealth</span>
        </h1>
        <p className="text-lg font-medium opacity-60 max-w-2xl mx-auto leading-relaxed mt-2">
          Private, one-time Ethereum addresses powered by the Dual-Key Stealth
          model and GunDB. Complete ownership, zero trace.
        </p>

        <div className="flex justify-center gap-4 mt-8 flex-wrap">
          <span className="badge-custom">
            <span className="badge-dot bg-primary shadow-[0_0_8px_hsl(var(--p))]" />{" "}
            SHIP-03 Standard
          </span>
          <span className="badge-custom">
            <span className="badge-dot bg-success shadow-[0_0_8px_hsl(var(--su))]" />{" "}
            Decentralized
          </span>
          <span className="badge-custom">
            <span className="badge-dot bg-info shadow-[0_0_8px_hsl(var(--in))]" />{" "}
            Pulse Integrated
          </span>
        </div>
      </div>

      {/* Auth Gate */}
      {!isLoggedIn && (
        <div className="surface-container p-8 text-center space-y-6 flex flex-col items-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold font-heading mb-2">
              Connect to Stealth
            </h2>
            <p className="text-base-content/60 mb-8 font-medium">
              You need to be authenticated with Shogun to generate keys or scan
              for private transactions.
            </p>
            <div className="flex justify-center">
              <ShogunButton className="btn-primary-bloom shadow-xl shadow-primary/20 hover:shadow-2xl transition-all" />
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="surface-container p-8 flex flex-col items-center text-center hover:bg-base-300 transition-colors">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl mb-4">
            🧬
          </div>
          <h3 className="font-heading font-extrabold text-lg mb-2">
            1. Register
          </h3>
          <p className="text-sm font-medium text-base-content/50 leading-relaxed">
            Publish your Dual Stealth Public Keys: Spending (S) and Viewing (V).
          </p>
        </div>
        <div className="surface-container p-8 flex flex-col items-center text-center hover:bg-base-300 transition-colors">
          <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center text-2xl mb-4">
            📤
          </div>
          <h3 className="font-heading font-extrabold text-lg mb-2">2. Send</h3>
          <p className="text-sm font-medium text-base-content/50 leading-relaxed">
            Generate a unique Stealth Address (P) for your recipient on the fly.
          </p>
        </div>
        <div className="surface-container p-8 flex flex-col items-center text-center hover:bg-base-300 transition-colors">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-2xl mb-4">
            🔍
          </div>
          <h3 className="font-heading font-extrabold text-lg mb-2">3. Scan</h3>
          <p className="text-sm font-medium text-base-content/50 leading-relaxed">
            Detect incoming payments with your View Key without exposing funds.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="tab-pills">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-pill flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "tab-pill-active"
                    : "opacity-40 hover:opacity-100"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-expressive tracking-tight">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="surface-container p-8 md:p-12">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold font-heading flex items-center justify-center gap-3">
              <span className="opacity-30">{activeTabInfo.icon}</span>
              {activeTabInfo.label}
            </h2>
            <p className="text-base-content/50 font-medium mt-2 max-w-lg mx-auto leading-relaxed">
              {activeTabInfo.desc}
            </p>
          </div>

          <div className="transition-all duration-300">
            {activeTab === "register" && <RegisterStealth />}
            {activeTab === "send" && <SendStealth />}
            {activeTab === "scan" && <ScanAnnouncements />}
          </div>
        </div>
      </div>

      {/* Cryptography explainer */}
      <details className="group collapse collapse-arrow surface-container !bg-base-200/50">
        <summary className="collapse-title text-sm font-bold font-heading uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-all p-6">
          🔬 Protocol Architecture
        </summary>
        <div className="collapse-content px-6 pb-6 text-sm space-y-4 font-medium opacity-80">
          <p className="bg-base-300 p-6 rounded-[24px]">
            <strong>Dual-Key Stealth:</strong> Based on EIP-5564. Each user has
            two pairs: Spending (s, S) and Viewing (v, V). This allows
            "delegated scanning" where a third party can detect incoming
            payments using (v, V) without being able to spend them.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-base-300 p-6 rounded-[24px] font-mono text-xs">
              <div className="font-bold text-primary mb-2">
                Generation (Sender)
              </div>
              Sender generates ephemeral key (e, E).
              <br />
              Computes shared secret:{" "}
              <code className="text-primary">c = H(e * V)</code>.<br />
              Stealth address:{" "}
              <code className="text-primary">P = S + c * G</code>.
            </div>
            <div className="bg-base-300 p-6 rounded-[24px] font-mono text-xs">
              <div className="font-bold text-accent mb-2">
                Detection (Recipient)
              </div>
              Recipient computes:{" "}
              <code className="text-accent">c' = H(v * E)</code>.<br />
              If <code className="text-accent">P = S + c' * G</code>, entry is
              owned.
              <br />
              Spending requires: <code className="text-accent">p = s + c'</code>
              .
            </div>
          </div>
        </div>
      </details>
    </div>
  );
};

export default StealthDashboard;
