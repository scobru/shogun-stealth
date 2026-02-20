/**
 * SendStealth Component
 * Allows a user to generate a one-time stealth address for a recipient
 * and broadcast the signal to GunDB or On-Chain.
 */

import React, { useState } from "react";
import { useShogun } from "shogun-button-react";
import { ethers } from "ethers";
import { generateStealthAddress } from "../lib/stealthCore";
import {
  getStealthKeys,
  getAllRegistered,
  publishAnnouncement,
  type StealthRegistryEntry,
} from "../lib/gunStealth";
import { sendEthOnChain, getOnChainStealthKeys } from "../lib/stealthContract";

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

const StepHeader = ({
  n,
  label,
  active = true,
}: {
  n: number;
  label: string;
  active?: boolean;
}) => (
  <div
    className={`flex items-center gap-4 mb-8 ${!active ? "opacity-30" : ""}`}
  >
    <div
      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold font-heading shrink-0 shadow-sm transition-all ${active ? "bg-primary text-primary-content" : "bg-base-300 text-base-content/40"}`}
    >
      {n}
    </div>
    <span className="text-xl font-bold font-heading tracking-tight">
      {label}
    </span>
  </div>
);

export const SendStealth: React.FC = () => {
  const { isLoggedIn, core } = useShogun();
  const [recipientPub, setRecipientPub] = useState("");
  const [recipientEntry, setRecipientEntry] =
    useState<StealthRegistryEntry | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<
    StealthRegistryEntry[]
  >([]);
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [stealthAddress, setStealthAddress] = useState("");
  const [ephemeralPubKey, setEphemeralPubKey] = useState("");
  const [viewTag, setViewTag] = useState("");

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [announced, setAnnounced] = useState(false);
  const [amount, setAmount] = useState("0.01"); // Default amount
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);
  const [step, setStep] = useState(1);

  const gun = (core as any)?.gun;

  const loadRegistry = async () => {
    if (!gun) return;
    setLoadingRegistry(true);
    const all = await getAllRegistered(gun);
    setRegisteredUsers(all);
    setLoadingRegistry(false);
  };

  const lookupRecipient = async () => {
    const input = recipientPub.trim();
    if (!input) return;
    setIsLookingUp(true);
    setStatus(null);
    setRecipientEntry(null);
    setStealthAddress("");
    setAnnounced(false);
    setStep(1);

    try {
      // 1. Check if input is an Ethereum address (On-Chain Lookup)
      if (ethers.isAddress(input)) {
        let provider = (core as any)?.signer?.provider;

        // Fallback to public RPC if Shogun provider is not ready
        if (!provider) {
          provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
        }

        const chainKeys = await getOnChainStealthKeys(provider, input);
        if (chainKeys) {
          setRecipientEntry({
            pub: input,
            alias: `Neural ID: ${input.slice(0, 6)}...`,
            spendingPubKey: chainKeys.spending,
            viewingPubKey: chainKeys.viewing,
            updatedAt: Date.now(),
          });
          setStatus({
            type: "success",
            msg: "🎯 Found on Base Sepolia Registry!",
          });
          setStep(2);
          return;
        }
      }

      // 2. Fallback to GunDB Lookup
      if (!gun) throw new Error("GunDB not available.");
      const entry = await getStealthKeys(gun, input);
      if (!entry) {
        setStatus({
          type: "error",
          msg: "Recipient not found in Gun or On-Chain. They must register first.",
        });
      } else {
        setRecipientEntry(entry);
        setStatus({
          type: "success",
          msg: `📡 Found on Gun Pulse: ${entry.alias || entry.pub.slice(0, 16) + "..."}`,
        });
        setStep(2);
      }
    } catch (e: any) {
      setStatus({ type: "error", msg: `Lookup failed: ${e.message}` });
    } finally {
      setIsLookingUp(false);
    }
  };

  const generateAddress = async () => {
    if (!recipientEntry) return;
    setIsGenerating(true);
    setStatus(null);
    try {
      const result = generateStealthAddress(
        recipientEntry.spendingPubKey,
        recipientEntry.viewingPubKey,
      );

      setStealthAddress(result.stealthAddress);
      setEphemeralPubKey(result.ephemeralPubKey);
      setViewTag(result.viewTag);

      setStep(3);
      setStatus({
        type: "info",
        msg: `🎯 One-time stealth address generated!`,
      });
    } catch (e: any) {
      setStatus({ type: "error", msg: `Generation failed: ${e.message}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const broadcastSignal = async (mode: "gun" | "chain") => {
    if (!stealthAddress || !ephemeralPubKey || !recipientEntry) return;
    setIsPublishing(true);
    setStatus(null);
    try {
      if (mode === "gun") {
        if (!gun) throw new Error("GunDB not available.");
        await publishAnnouncement(gun, {
          ephemeralPubKey,
          stealthAddress,
          viewTag,
        });
        setStatus({ type: "success", msg: "📡 Signal broadcasted to GunDB!" });
      } else {
        let signer = (core as any)?.signer;

        // Fallback to MetaMask if core.signer is not available
        if (!signer && (window as any).ethereum) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          signer = await provider.getSigner();
        }

        if (!signer) throw new Error("Wallet not connected.");

        const txHash = await sendEthOnChain(signer, {
          receiver: stealthAddress,
          ephemeralPubKey,
          viewTag,
          amount,
        });

        // Proactive: Also push a "pointer" to GunDB for instant discovery
        if (gun) {
          try {
            await publishAnnouncement(gun, {
              ephemeralPubKey,
              stealthAddress,
              viewTag,
              metadata: txHash, // Store txHash in metadata
            });
            console.log(
              "[Stealth] Shadow signal pushed to GunDB for fast discovery",
            );
          } catch (ge) {
            console.warn("[Stealth] Failed to push shadow signal to Gun:", ge);
          }
        }

        setStatus({
          type: "success",
          msg: `⛓️ Atomic Signal Broadcasted! TX: ${txHash.slice(0, 10)}...`,
        });
      }
      setAnnounced(true);
      setStep(4);
    } catch (e: any) {
      console.error("Broadcast error:", e);
      setStatus({ type: "error", msg: `Broadcast failed: ${e.message}` });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDirectTransfer = async () => {
    if (!stealthAddress || !(window as any).ethereum) {
      setStatus({ type: "error", msg: "MetaMask not detected." });
      return;
    }
    try {
      setStatus({ type: "info", msg: "Initiating direct transfer..." });
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: stealthAddress,
        value: ethers.parseEther(amount),
      });

      setStatus({
        type: "success",
        msg: `Sent ${amount} ETH to ${stealthAddress.slice(0, 10)}... (TX: ${tx.hash.slice(0, 8)})`,
      });
    } catch (e: any) {
      setStatus({ type: "error", msg: e.message });
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="space-y-8">
      {/* 1. Recipient Lookup */}
      <div
        className={`surface-container transition-all ${step >= 1 ? "opacity-100" : "opacity-30 grayscale"}`}
      >
        <StepHeader n={1} label="Target Recipient" active={step >= 1} />
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            className="input-material flex-1 font-mono"
            placeholder="Gun pub or 0x address..."
            value={recipientPub}
            onChange={(e) => setRecipientPub(e.target.value)}
          />
          <button
            className={`btn-primary-bloom px-10 h-[56px] shadow-lg shadow-primary/10 ${isLookingUp ? "animate-pulse" : ""}`}
            onClick={lookupRecipient}
            disabled={isLookingUp || !recipientPub.trim()}
          >
            {isLookingUp ? "..." : "Identify"}
          </button>
        </div>

        <div className="flex justify-between items-center px-4 mb-4">
          <p className="text-[10px] uppercase font-bold opacity-30 tracking-[0.2em]">
            Protocol Registry (Gun)
          </p>
          <button
            className="text-[10px] uppercase font-bold text-primary opacity-60 hover:opacity-100 transition-all hover:tracking-widest"
            onClick={loadRegistry}
          >
            {loadingRegistry ? "Syncing..." : "Pulse Refresh"}
          </button>
        </div>

        {registeredUsers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto px-1 custom-scrollbar">
            {registeredUsers.map((u) => (
              <button
                key={u.pub}
                className="bg-base-300 hover:bg-primary/10 border border-base-200 rounded-[20px] p-4 text-left transition-all group"
                onClick={() => setRecipientPub(u.pub)}
              >
                <div className="font-bold text-xs truncate mb-1 group-hover:text-primary">
                  {u.alias || "Anonymous Identity"}
                </div>
                <code className="text-[10px] opacity-30 font-mono block truncate">
                  {u.pub}
                </code>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Generate */}
      <div
        className={`surface-container transition-all ${step >= 2 ? "opacity-100" : "opacity-30 grayscale"}`}
      >
        <StepHeader n={2} label="Stealth Forge" active={step >= 2} />
        <p className="text-sm font-medium opacity-50 mb-8 leading-relaxed max-w-lg">
          Generating a one-time cryptographic alias using the shared secret.
          Only this identity will be able to detect the blast signal.
        </p>
        <button
          className="btn-primary-bloom w-full py-5 rounded-full flex justify-center items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10"
          onClick={generateAddress}
          disabled={isGenerating || step < 2}
        >
          {isGenerating ? (
            <span className="loading loading-dots loading-sm"></span>
          ) : (
            <>
              <span className="text-xl">⚔️</span>
              <span className="font-heading font-extrabold uppercase tracking-widest text-xs">
                Forging Destination
              </span>
            </>
          )}
        </button>
        {stealthAddress && (
          <div className="mt-8 bg-primary/5 rounded-[28px] p-8 relative group border border-primary/10">
            <div className="flex justify-between items-center mb-6">
              <label className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em] block">
                Derived Address
              </label>
              {viewTag && (
                <span className="text-[10px] font-extrabold bg-primary text-primary-content px-3 py-1 rounded-full shadow-lg shadow-primary/20">
                  TAG: {viewTag}
                </span>
              )}
            </div>
            <code className="text-lg font-mono text-primary font-bold break-all block leading-relaxed pr-10">
              {stealthAddress}
            </code>
            <button
              className="absolute top-8 right-8 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all opacity-40 hover:opacity-100"
              onClick={() => navigator.clipboard.writeText(stealthAddress)}
            >
              📋
            </button>
          </div>
        )}
      </div>

      {/* 3. Send */}
      <div
        className={`surface-container transition-all ${step >= 3 ? "opacity-100" : "opacity-30 grayscale"}`}
      >
        <StepHeader n={3} label="Transfer Pulse" active={step >= 3} />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] ml-6">
              Pulse Amount (ETH)
            </label>
            <input
              type="text"
              className="input-material !bg-base-200"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              className="flex-1 btn-secondary-bloom w-full sm:w-auto"
              onClick={handleDirectTransfer}
              disabled={step < 3}
            >
              <span className="text-xl">🦊</span>
              <span>Direct Transfer</span>
            </button>
            <a
              href={`https://sepolia.basescan.org/address/${stealthAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center text-xs font-bold font-heading uppercase tracking-widest opacity-40 hover:opacity-100 transition-all bg-base-300 rounded-full h-[56px] border border-base-100/10"
            >
              View Explorer ↗
            </a>
          </div>
        </div>
      </div>

      {/* 4. Announce */}
      <div
        className={`surface-container transition-all ${step >= 3 ? "opacity-100" : "opacity-30 grayscale"}`}
      >
        <StepHeader n={4} label="Signal Finalization" active={step >= 3} />
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            className={`flex-1 py-5 rounded-full font-heading font-extrabold text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${
              announced
                ? "bg-success/20 text-success"
                : "bg-base-300 hover:bg-base-100 text-base-content"
            }`}
            onClick={() => broadcastSignal("gun")}
            disabled={isPublishing || announced || !stealthAddress || step < 3}
          >
            {announced ? "✨ GUN SIGNAL SYNCED" : "📡 BROADCAST GUN"}
          </button>
          <button
            className={`flex-1 py-5 rounded-full font-heading font-extrabold text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${
              announced
                ? "bg-primary/20 text-primary"
                : "bg-primary text-primary-content hover:scale-[1.02]"
            }`}
            onClick={() => broadcastSignal("chain")}
            disabled={isPublishing || announced || !stealthAddress || step < 3}
          >
            {announced ? "⛓️ CHAIN SIGNAL SYNCED" : "⛓️ BROADCAST CHAIN"}
          </button>
        </div>
      </div>

      {status && (
        <div
          className={`p-6 rounded-[24px] text-xs font-bold text-center uppercase tracking-widest shadow-sm transition-all ${
            status.type === "success"
              ? "bg-success text-success-content"
              : status.type === "error"
                ? "bg-error text-error-content"
                : "bg-primary text-primary-content"
          }`}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
};

export default SendStealth;
