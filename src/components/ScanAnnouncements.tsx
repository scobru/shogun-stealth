/**
 * ScanAnnouncements Component
 * Scans Gun announcements to find stealth addresses the logged-in user controls.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useShogun } from "shogun-button-react";
import { ethers } from "ethers";
import {
  scanAnnouncements,
  type StealthAnnouncement,
  type StealthKeys,
  deriveStealthKeysFromGun,
} from "../lib/stealthCore";
import {
  subscribeToAnnouncements,
  getAllAnnouncements,
  deleteAnnouncement,
} from "../lib/gunStealth";

interface OwnedAnnouncement extends StealthAnnouncement {
  privateKey: string;
  wallet: ethers.Wallet;
  balance?: string;
  balanceWei?: bigint;
}

// Sepolia public RPC
// Base Sepolia RPC and Chain ID
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_SEPOLIA_CHAIN_ID = 84532;

export const ScanAnnouncements: React.FC = () => {
  const { isLoggedIn, core } = useShogun();
  const [stealthKeys, setStealthKeys] = useState<StealthKeys | null>(null);
  const [announcements, setAnnouncements] = useState<StealthAnnouncement[]>([]);
  const [ownedAddresses, setOwnedAddresses] = useState<OwnedAnnouncement[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  // Sweep state: entryId → { toAddress, isSending, txHash, error }
  const [sweepState, setSweepState] = useState<
    Record<
      string,
      { to: string; sending: boolean; txHash?: string; error?: string }
    >
  >({});

  const gun = core?.gun;

  // Load user pair and derive stealth keys
  useEffect(() => {
    if (!isLoggedIn || !core || !(core as any).gun) return;

    const tryDeriveKeys = () => {
      const gun = core?.gun;
      const userPair =
        (core as any)?._user?._.sea ||
        (gun as any)?.user?.()?._?.sea ||
        (core as any)?.db?.user?._?.sea ||
        null;
      if (userPair?.epriv) {
        setStealthKeys(deriveStealthKeysFromGun(userPair.epriv));
        return true;
      }
      return false;
    };

    if (tryDeriveKeys()) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryDeriveKeys() || attempts >= 20) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
  }, [isLoggedIn, core]);

  // Subscribe to live announcements
  useEffect(() => {
    if (!gun || !isSubscribed) return;

    const unsub = subscribeToAnnouncements(gun, (ann) => {
      setAnnouncements((prev) => {
        if (prev.find((a) => a.id === ann.id)) return prev;
        return [...prev, ann];
      });
      setTotalAnnouncements((n) => n + 1);
    });

    return () => unsub();
  }, [gun, isSubscribed]);

  const loadAndScan = useCallback(async () => {
    if (!gun || !stealthKeys) return;
    setIsScanning(true);
    setStatus("Loading announcements from Gun...");
    try {
      const all = await getAllAnnouncements(gun);
      setTotalAnnouncements(all.length);
      setAnnouncements(all);
      setStatus(`Scanning ${all.length} announcements...`);

      const owned = scanAnnouncements(all, stealthKeys);
      setOwnedAddresses(owned);

      if (owned.length > 0) {
        setStatus(`✅ Found ${owned.length} address(es)! Syncing balances...`);
        // Auto-fetch balances after finding addresses
        setTimeout(() => loadBalances("sepolia"), 100);
      } else {
        setStatus(
          "🔍 No addresses found for your keys. (New announcements will appear in real-time if subscribed.)",
        );
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  }, [gun, stealthKeys]);

  const loadBalances = async (network: "mainnet" | "sepolia" = "sepolia") => {
    if (ownedAddresses.length === 0) return;
    setIsLoadingBalances(true);
    try {
      const rpc =
        network === "sepolia" ? BASE_SEPOLIA_RPC : "https://cloudflare-eth.com";
      const provider = new ethers.JsonRpcProvider(rpc);

      const updated = await Promise.all(
        ownedAddresses.map(async (entry) => {
          try {
            const bal = await provider.getBalance(entry.stealthAddress);
            return {
              ...entry,
              balance: ethers.formatEther(bal),
              balanceWei: bal,
            };
          } catch {
            return { ...entry, balance: "?", balanceWei: 0n };
          }
        }),
      );
      setOwnedAddresses(updated);
    } catch (e: any) {
      console.error("Balance fetch error:", e);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemoveAnnouncement = async (annId: string) => {
    if (!gun) return;
    try {
      await deleteAnnouncement(gun, annId);
      setOwnedAddresses((prev) => prev.filter((o) => o.id !== annId));
      setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
      setStatus("✨ Signal deleted from GunDB");
    } catch (e: any) {
      setStatus(`Error deleting signal: ${e.message}`);
    }
  };

  /** Sweep all ETH from stealth address → destination on Sepolia */
  const sweepFunds = async (entry: OwnedAnnouncement) => {
    const state = sweepState[entry.id];
    if (!state?.to || !ethers.isAddress(state.to)) {
      setSweepState((prev) => ({
        ...prev,
        [entry.id]: { ...state, error: "Invalid destination address" },
      }));
      return;
    }

    setSweepState((prev) => ({
      ...prev,
      [entry.id]: {
        ...state,
        sending: true,
        error: undefined,
        txHash: undefined,
      },
    }));

    try {
      const provider = new ethers.JsonRpcProvider(
        BASE_SEPOLIA_RPC,
        BASE_SEPOLIA_CHAIN_ID,
      );
      const wallet = entry.wallet.connect(provider);

      // Get current balance
      const balance = await provider.getBalance(entry.stealthAddress);
      if (balance === 0n) throw new Error("Balance is 0 on Base Sepolia");

      // Estimate gas and fees
      const feeData = await provider.getFeeData();

      // Use maxFeePerGas if available (EIP-1559), otherwise fallback to gasPrice
      const gasPrice =
        feeData.gasPrice ??
        feeData.maxFeePerGas ??
        ethers.parseUnits("1", "gwei");

      // On Base, we need to account for L1 data fees.
      // 21000 is the L2 execution gas, but the total cost includes L1 overhead.
      const l2GasLimit = 21000n;
      const l2Cost = l2GasLimit * gasPrice;

      // Add a buffer for L1 fees (approx 0.00005 - 0.0001 ETH on Base Sepolia)
      const l1Buffer = ethers.parseUnits("0.0001", "ether");
      const totalCost = l2Cost + l1Buffer;

      if (balance <= totalCost) {
        throw new Error(
          `Balance (${ethers.formatEther(balance)} ETH) too low to cover gas & L1 fees (~${ethers.formatEther(totalCost)} ETH)`,
        );
      }

      const sendAmount = balance - totalCost;

      const tx = await wallet.sendTransaction({
        to: state.to,
        value: sendAmount,
        gasLimit: l2GasLimit,
        gasPrice: gasPrice,
      });

      setSweepState((prev) => ({
        ...prev,
        [entry.id]: { ...state, sending: false, txHash: tx.hash },
      }));

      // Update balance
      setOwnedAddresses((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, balance: "0.0", balanceWei: 0n } : e,
        ),
      );
    } catch (e: any) {
      setSweepState((prev) => ({
        ...prev,
        [entry.id]: { ...state, sending: false, error: e.message },
      }));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="card bg-base-200 p-6 text-center">
        <p className="text-base-content/60">
          🔐 Login required to scan for your stealth transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <button
          className={`p-8 rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all ${
            isScanning
              ? "bg-primary text-primary-content shadow-xl shadow-primary/20 animate-pulse"
              : "surface-container hover:bg-base-300 hover:scale-[1.03] shadow-sm"
          }`}
          onClick={loadAndScan}
          disabled={isScanning || !stealthKeys}
        >
          <span className="text-3xl">🔍</span>
          <span className="text-xs font-bold font-heading uppercase tracking-[0.2em]">
            {isScanning ? "Scanning..." : "Deep Scan"}
          </span>
        </button>

        <button
          className={`p-8 rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all ${
            isSubscribed
              ? "bg-success text-success-content shadow-xl shadow-success/20"
              : "surface-container hover:bg-base-300 hover:scale-[1.03] shadow-sm"
          }`}
          onClick={() => setIsSubscribed((v) => !v)}
        >
          <span className="text-3xl">{isSubscribed ? "📡" : "🌑"}</span>
          <span className="text-xs font-bold font-heading uppercase tracking-[0.2em]">
            {isSubscribed ? "Live Sync" : "Go Live"}
          </span>
        </button>

        <button
          className={`p-8 rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all shadow-sm ${
            isLoadingBalances
              ? "bg-accent text-accent-content animate-pulse"
              : "surface-container hover:bg-base-300 hover:scale-[1.03]"
          } disabled:opacity-30`}
          onClick={() => loadBalances("sepolia")}
          disabled={isLoadingBalances || ownedAddresses.length === 0}
        >
          <span className="text-3xl">💰</span>
          <span className="text-xs font-bold font-heading uppercase tracking-[0.2em]">
            {isLoadingBalances ? "Checking..." : "Pulse Check"}
          </span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="flex gap-6">
        <div className="flex-1 surface-container p-8 text-center bg-base-300/50">
          <div className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] mb-3">
            Discovery Signals
          </div>
          <div className="text-4xl font-heading font-extrabold tracking-tighter">
            {totalAnnouncements}
          </div>
        </div>
        <div className="flex-1 surface-container p-8 text-center border-2 border-success/10">
          <div className="text-[10px] font-bold text-success uppercase tracking-[0.2em] mb-3">
            Controlled Cells
          </div>
          <div className="text-4xl font-heading font-extrabold text-success tracking-tighter">
            {ownedAddresses.length}
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {status && (
        <div className="surface-container !bg-base-200/40 p-5 text-xs font-bold font-heading uppercase tracking-widest text-center opacity-60 rounded-full">
          {status}
        </div>
      )}

      {/* Owned Addresses */}
      {ownedAddresses.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xs font-bold font-heading opacity-30 uppercase tracking-[0.3em] ml-6 pt-4">
            Authorized Ownership Nodes
          </h3>
          {ownedAddresses.map((entry) => (
            <div
              key={entry.id}
              className="surface-container-high p-8 md:p-10 space-y-8 relative overflow-hidden group border border-success/5 shadow-xl shadow-black/5"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-success/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none transition-all group-hover:bg-success/10"></div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-success">
                    <span className="badge-dot bg-success animate-pulse shadow-[0_0_12px_hsl(var(--su))]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest font-heading">
                      Cell Linked & Verified
                    </span>
                  </div>
                  <code className="text-2xl font-mono font-bold block break-all pt-2 leading-tight tracking-tight selection:bg-success selection:text-success-content">
                    {entry.stealthAddress}
                  </code>
                </div>
                <div className="text-left md:text-right shrink-0">
                  {entry.balance !== undefined && (
                    <div className="text-4xl font-heading font-extrabold text-success tracking-tighter">
                      {entry.balance}{" "}
                      <span className="text-lg opacity-40 font-bold ml-1">
                        ETH
                      </span>
                    </div>
                  )}
                  <div className="text-[10px] font-bold opacity-30 mt-2 uppercase tracking-[0.2em]">
                    Detected {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap pt-4">
                <a
                  href={`https://sepolia.basescan.org/address/${entry.stealthAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-base-300 hover:bg-base-100 rounded-full px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                >
                  Exp ↗
                </a>
                <button
                  className={`rounded-full px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${
                    revealedKeys.has(entry.id)
                      ? "bg-error text-error-content"
                      : "bg-primary/20 text-primary hover:bg-primary/30"
                  }`}
                  onClick={() => toggleRevealKey(entry.id)}
                >
                  {revealedKeys.has(entry.id) ? "Seal Key" : "Expose Key"}
                </button>
                <button
                  className="bg-base-300 hover:bg-error/10 hover:text-error rounded-full px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all"
                  onClick={() => handleRemoveAnnouncement(entry.id)}
                >
                  Purge Signal
                </button>
                <button
                  className="bg-base-300 hover:bg-base-100 rounded-full px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                  onClick={() =>
                    navigator.clipboard.writeText(entry.stealthAddress)
                  }
                >
                  Copy
                </button>
              </div>

              {revealedKeys.has(entry.id) && (
                <div className="bg-error/5 border border-error/10 rounded-[28px] p-8 mt-6">
                  <div className="flex items-center gap-3 text-error mb-6">
                    <span className="text-2xl">⚠️</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] font-heading">
                      Secret Access Sequence - DO NOT BROADCAST
                    </span>
                  </div>
                  <code className="text-xs font-mono break-all block bg-base-300 p-6 rounded-2xl border border-white/5 leading-relaxed selection:bg-error selection:text-error-content shadow-inner">
                    {entry.privateKey}
                  </code>
                  <button
                    className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-error opacity-60 hover:opacity-100 transition-all hover:tracking-widest"
                    onClick={() =>
                      navigator.clipboard.writeText(entry.privateKey)
                    }
                  >
                    Copy Spending Secret
                  </button>
                </div>
              )}

              {/* Sweep Panel */}
              <div className="surface-container !bg-base-200/50 p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold opacity-40 uppercase tracking-[0.2em] font-heading">
                    Withdrawal Authorization
                  </span>
                  <span className="text-[10px] opacity-20 font-bold uppercase">
                    Base Sepolia Pulse
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    className="input-material flex-1"
                    placeholder="Vault destination 0x..."
                    value={sweepState[entry.id]?.to ?? ""}
                    onChange={(e) =>
                      setSweepState((prev) => ({
                        ...prev,
                        [entry.id]: {
                          ...prev[entry.id],
                          to: e.target.value,
                          sending: false,
                        },
                      }))
                    }
                  />
                  <button
                    className={`btn-primary-bloom !bg-success text-success-content px-10 h-[56px] shadow-lg shadow-success/10 ${
                      sweepState[entry.id]?.sending ? "animate-pulse" : ""
                    }`}
                    disabled={sweepState[entry.id]?.sending}
                    onClick={() => sweepFunds(entry)}
                  >
                    {sweepState[entry.id]?.sending ? "..." : "Sweep Pulse"}
                  </button>
                </div>

                {sweepState[entry.id]?.error && (
                  <div className="text-[10px] text-error font-extrabold text-center uppercase tracking-widest bg-error/10 p-4 rounded-full">
                    Protocol Error: {sweepState[entry.id].error}
                  </div>
                )}

                {sweepState[entry.id]?.txHash && (
                  <div className="bg-success text-success-content rounded-3xl p-6 flex flex-col gap-2 items-center shadow-xl shadow-success/20 animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">
                      Broadcast Complete
                    </span>
                    <a
                      href={`https://sepolia.basescan.org/tx/${sweepState[entry.id].txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono opacity-80 hover:opacity-100 truncate w-full text-center underline decoration-dotted underline-offset-4"
                    >
                      {sweepState[entry.id].txHash}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw Signals (Collapsible) */}
      <details className="group surface-container !bg-transparent !border-base-content/5 overflow-hidden">
        <summary className="p-8 cursor-pointer hover:bg-base-200 transition-all flex items-center justify-between text-xs font-bold font-heading opacity-30 uppercase tracking-[0.3em]">
          Browse Protocol Traffic ({announcements.length})
          <span className="group-open:rotate-180 transition-transform text-lg text-primary">
            ↓
          </span>
        </summary>
        <div className="p-8 pt-0 overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse font-medium">
            <thead>
              <tr className="border-b-2 border-base-content/5 text-primary/40 uppercase tracking-[0.2em] font-heading font-extrabold">
                <th className="py-4 px-3">Target Node</th>
                <th className="py-4 px-3">Tag</th>
                <th className="py-4 px-3">Temporal Key</th>
                <th className="py-4 px-3">Auth Status</th>
              </tr>
            </thead>
            <tbody className="opacity-80">
              {announcements.map((ann) => {
                const isOwned = ownedAddresses.some((o) => o.id === ann.id);
                return (
                  <tr
                    key={ann.id}
                    className={`border-b border-base-content/5 hover:bg-base-200 transition-colors ${isOwned ? "bg-success/10 text-success font-bold" : "opacity-50"}`}
                  >
                    <td className="py-4 px-3 font-mono">
                      {ann.stealthAddress.slice(0, 18)}...
                    </td>
                    <td className="py-4 px-3 font-mono">
                      <span className="bg-base-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                        {ann.viewTag || "0x-"}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-mono">
                      {ann.ephemeralPubKey.slice(0, 12)}...
                    </td>
                    <td className="py-4 px-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${isOwned ? "bg-success text-success-content" : "bg-base-300 opacity-40"}`}
                      >
                        {isOwned ? "Authorized" : "Unknown"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default ScanAnnouncements;
