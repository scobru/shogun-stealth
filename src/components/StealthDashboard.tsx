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

import ManualVault from "./ManualVault";

type Tab = "register" | "send" | "scan" | "vault";

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
    label: "Explorer",
    icon: "🔍",
    desc: "Scan the Shogun network for stealth signals using your viewing key.",
  },
  {
    id: "vault",
    label: "Manual Vault",
    icon: "🔑",
    desc: "Directly manage stealth addresses using a private key to sweep funds.",
  },
];

export const StealthDashboard: React.FC = () => {
  const { isLoggedIn } = useShogun();
  const [activeTab, setActiveTab] = useState<Tab>("register");

  const activeTabInfo = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Auth Gate */}
      {!isLoggedIn && (
        <div className="surface-container p-12 text-center flex flex-col items-center">
          <div className="max-w-md mx-auto space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold font-heading">
                Gateway to Stealth
              </h2>
              <p className="text-base-content/40 font-medium leading-relaxed">
                Connect your Shogun identity to access private transaction
                vaults and cryptographic scanning tools.
              </p>
            </div>
            <div className="flex justify-center">
              <ShogunButton className="btn-primary-bloom" />
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="space-y-12">
        <div className="flex justify-center">
          <div className="bg-base-200 p-2 rounded-3xl border border-primary/5 flex flex-wrap justify-center gap-1 md:gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-3 px-4 py-2 md:px-8 md:py-4 rounded-full text-xs md:text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-base-100 shadow-xl shadow-primary/20 scale-105"
                    : "opacity-40 hover:opacity-100"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-xl">{tab.icon}</span>
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
            {activeTab === "vault" && <ManualVault />}
          </div>
        </div>
      </div>

      {/* Cryptography explainer */}
      <details className="group collapse collapse-arrow surface-container !bg-base-200/50">
        <summary className="collapse-title text-sm font-bold font-heading uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-all p-6">
          🔬 Protocol Architecture
        </summary>
        <div className="collapse-content px-10 pb-10 space-y-8 font-medium">
          {/* How it Works Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tighter text-primary flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">
                01
              </span>
              How it works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="surface-container !bg-base-200 p-8 rounded-[32px] border-2 border-base-content/5">
                <p className="text-xs leading-relaxed opacity-70">
                  <strong className="text-base-content block mb-2 uppercase tracking-widest text-[10px]">
                    Step 1: Identity Generation
                  </strong>
                  When you register, Shogun derives a unique pair of stealth
                  keys (Spending & Viewing) from your decentralized identity.
                  These keys are published to GunDB and optionally on-chain.
                </p>
              </div>
              <div className="surface-container !bg-base-200 p-8 rounded-[32px] border-2 border-base-content/5">
                <p className="text-xs leading-relaxed opacity-70">
                  <strong className="text-base-content block mb-2 uppercase tracking-widest text-[10px]">
                    Step 2: Stealth Forge
                  </strong>
                  To send funds, the sender uses your public keys to "forge" a
                  one-time stealth address. This address doesn't exist on-chain
                  until the transaction occurs, breaking the link between
                  identities.
                </p>
              </div>
              <div className="surface-container !bg-base-200 p-8 rounded-[32px] border-2 border-base-content/5">
                <p className="text-xs leading-relaxed opacity-70">
                  <strong className="text-base-content block mb-2 uppercase tracking-widest text-[10px]">
                    Step 3: Signal Broadcast
                  </strong>
                  A cryptographic signal is broadcast to the network. This
                  signal contains no private data, only a "view tag" that only
                  you can detect.
                </p>
              </div>
              <div className="surface-container !bg-base-200 p-8 rounded-[32px] border-2 border-base-content/5">
                <p className="text-xs leading-relaxed opacity-70">
                  <strong className="text-base-content block mb-2 uppercase tracking-widest text-[10px]">
                    Step 4: Silent Discovery
                  </strong>
                  Your node scans the network pulse using your Viewing Key. When
                  a match is found, your node derives the private key for that
                  specific stealth address to unlock the funds.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-base-content/10 my-4" />

          {/* Technical Details Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tighter text-accent flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm">
                02
              </span>
              Cryptography (EIP-5564)
            </h3>
            <p className="text-xs leading-relaxed opacity-70 bg-base-300/30 p-8 rounded-[32px] border-4 border-dashed border-base-content/10">
              Each user has two keypairs: <strong>Spending (s, S)</strong> and{" "}
              <strong>Viewing (v, V)</strong>. This architecture enables
              "delegated scanning" where a node can detect payments using only
              your viewing keys without having any power to spend them.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-base-300 p-8 rounded-[32px] font-mono text-xs border-4 border-base-content/10">
                <div className="font-bold text-primary mb-4 uppercase tracking-[0.2em] text-[10px]">
                  Forge Sequence (Sender)
                </div>
                Sender generates ephemeral key (e, E).
                <br />
                Shared secret:{" "}
                <code className="text-primary font-bold">c = H(e * V)</code>.
                <br />
                Stealth address:{" "}
                <code className="text-primary font-bold">P = S + c * G</code>.
              </div>
              <div className="bg-base-300 p-8 rounded-[32px] font-mono text-xs border-4 border-base-content/10">
                <div className="font-bold text-accent mb-4 uppercase tracking-[0.2em] text-[10px]">
                  Detection Logic (Recipient)
                </div>
                Recipient computes:{" "}
                <code className="text-accent font-bold">c' = H(v * E)</code>.
                <br />
                Checking:{" "}
                <code className="text-accent font-bold">P == S + c' * G</code>.
                <br />
                Spending secret:{" "}
                <code className="text-accent font-bold">p = s + c'</code>.
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
};

export default StealthDashboard;
