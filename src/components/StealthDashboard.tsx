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

import { useNetwork } from "../lib/NetworkContext";

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
  const { currentNetwork } = useNetwork();
  const [activeTab, setActiveTab] = useState<Tab>("register");

  const activeTabInfo = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="surface-container-high p-12 md:p-20 text-center relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
        <div className="hero-badge !bg-primary/20 !text-primary !mb-6">
          Neural Protocol v1.0
        </div>
        <h1 className="font-heading text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">
          Shogun <span className="text-primary">Stealth</span>
        </h1>
        <p className="text-xl font-medium opacity-50 max-w-2xl mx-auto leading-relaxed">
          Zero-trace Ethereum transactions powered by GunDB and
          <span className="text-primary/80 font-bold ml-1">
            Dual-Key Stealth
          </span>{" "}
          technology.
        </p>

        <div className="flex justify-center gap-6 mt-10 flex-wrap">
          <div className="flex items-center gap-2 bg-base-300 px-6 py-2.5 rounded-full border border-primary/5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              {currentNetwork.name} Active
            </span>
          </div>
          <div className="flex items-center gap-2 bg-success/10 text-success px-6 py-2.5 rounded-full border border-success/20">
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Decentralized
            </span>
          </div>
        </div>
      </div>

      {/* Auth Gate */}
      {!isLoggedIn && (
        <div className="surface-container p-12 text-center flex flex-col items-center">
          <div className="max-w-md mx-auto space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold font-heading">
                Gateway to Privacy
              </h2>
              <p className="text-base-content/40 font-medium leading-relaxed">
                Connect your neural identity to access private transaction
                vaults and cryptographic scanning tools.
              </p>
            </div>
            <div className="flex justify-center scale-110">
              <ShogunButton className="btn-primary-bloom" />
            </div>
          </div>
        </div>
      )}

      {/* Protocol Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: "🧬",
            title: "Generate",
            desc: "Derive spending and viewing keys from your neural pair.",
            color: "primary",
          },
          {
            icon: "📤",
            title: "Transmit",
            desc: "Send funds to one-time addresses without linking identities.",
            color: "secondary",
          },
          {
            icon: "🔍",
            title: "Discover",
            desc: "Scan the abyss for funds using only your viewing key.",
            color: "accent",
          },
        ].map((step, i) => (
          <div
            key={i}
            className="surface-container p-10 flex flex-col items-center text-center group hover:bg-base-200 transition-all cursor-default"
          >
            <div
              className={`w-16 h-16 rounded-3xl bg-${step.color}/10 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform`}
            >
              {step.icon}
            </div>
            <h3 className="font-heading font-extrabold text-xl mb-3">
              {step.title}
            </h3>
            <p className="text-[13px] font-medium text-base-content/40 leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="space-y-12">
        <div className="flex justify-center">
          <div className="bg-base-200 p-2 rounded-full border border-primary/5 flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-3 px-8 py-4 rounded-full text-sm font-bold transition-all ${
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
