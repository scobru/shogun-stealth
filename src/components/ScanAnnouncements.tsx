/**
 * ScanAnnouncements Component
 * Scans Gun announcements to find stealth addresses the logged-in user controls.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useShogun } from "shogun-button-react";
import { ethers } from "ethers";
import {
  scanAnnouncements,
  type StealthAnnouncement,
  type StealthKeys,
  deriveStealthKeysFromGun,
} from "../lib/stealthCore";
import AnnouncementRow from "./AnnouncementRow";
import { useNetwork } from "../lib/NetworkContext";
import {
  subscribeToAnnouncements,
  getAllAnnouncements,
  deleteAnnouncement,
} from "../lib/gunStealth";
import { fetchOnChainAnnouncements } from "../lib/stealthContract";

interface OwnedAnnouncement extends StealthAnnouncement {
  privateKey: string;
  wallet: ethers.Wallet;
  balance?: string;
  balanceWei?: bigint;
}

// Sepolia public RPC
export const ScanAnnouncements: React.FC = () => {
  const { isLoggedIn, core } = useShogun();
  const { currentNetwork } = useNetwork();
  const [stealthKeys, setStealthKeys] = useState<StealthKeys | null>(null);
  const [announcements, setAnnouncements] = useState<StealthAnnouncement[]>([]);
  const [ownedAddresses, setOwnedAddresses] = useState<OwnedAnnouncement[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedAddrId, setCopiedAddrId] = useState<string | null>(null);
  // Sweep state: entryId → { toAddress, isSending, txHash, error }
  const [sweepState, setSweepState] = useState<
    Record<
      string,
      { to: string; sending: boolean; txHash?: string; error?: string }
    >
  >({});

  const gun = core?.gun;

  const ownedIds = useMemo(
    () => new Set(ownedAddresses.map((o) => o.id)),
    [ownedAddresses],
  );

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
    setStatus("Syncing network signals (Gun + Base)...");
    try {
      // Parallel Fetch: Fetch from GunDB and Chain simultaneously
      const provider =
        (core as any)?.signer?.provider ||
        new ethers.JsonRpcProvider(currentNetwork.rpcUrl);

      const [gunAnnouncements, chainAnnouncements] = await Promise.all([
        getAllAnnouncements(gun),
        provider
          ? fetchOnChainAnnouncements(
              currentNetwork.registryAddress,
              currentNetwork.forwarderAddress,
              provider,
            ).catch((e) => {
              console.warn("Chain fetch failed:", e);
              return [] as StealthAnnouncement[];
            })
          : Promise.resolve([] as StealthAnnouncement[]),
      ]);

      const all = [...gunAnnouncements, ...chainAnnouncements];

      setTotalAnnouncements(all.length);
      setAnnouncements(all);
      setStatus(`Scanning ${all.length} total signals...`);

      const owned = await scanAnnouncements(all, stealthKeys);
      setOwnedAddresses(owned);

      if (owned.length > 0) {
        setStatus(`✅ Found ${owned.length} address(es)! Syncing balances...`);
        setTimeout(() => loadBalances(), 100);
      } else {
        setStatus(
          "🔍 No addresses found. (New signals will appear if subscribed.)",
        );
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  }, [gun, stealthKeys, core]);

  const loadBalances = async () => {
    if (ownedAddresses.length === 0) return;
    setIsLoadingBalances(true);
    try {
      const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);

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

  const handleCopyAddr = (id: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddrId(id);
    setTimeout(() => setCopiedAddrId(null), 2000);
  };

  const handleCopyPk = (id: string, pk: string) => {
    navigator.clipboard.writeText(pk);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleRemoveAnnouncement = useCallback(
    async (annId: string) => {
      if (!gun) return;
      try {
        await deleteAnnouncement(gun, annId);
        setOwnedAddresses((prev) => prev.filter((o) => o.id !== annId));
        setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
        setStatus("✨ Signal deleted from GunDB");
      } catch (e: any) {
        setStatus(`Error deleting signal: ${e.message}`);
      }
    },
    [gun],
  );

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
        currentNetwork.rpcUrl,
        currentNetwork.chainId,
      );
      const wallet = entry.wallet.connect(provider);

      // Get current balance
      const balance = await provider.getBalance(entry.stealthAddress);
      if (balance === 0n)
        throw new Error(`Balance is 0 on ${currentNetwork.name}`);

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
      <div className="bg-base-200 border-4 border-base-content p-12 rounded-[40px] text-center shadow-[24px_24px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]">
        <p className="font-heading font-black text-xl uppercase tracking-tighter opacity-40">
          🔐 Sequence Authorization Required
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* 1. Network Pulse Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <button
          className={`p-10 rounded-[40px] border-4 border-base-content flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-2 active:translate-y-0 ${
            isScanning
              ? "bg-primary text-base-100 shadow-[12px_12px_0px_0px_rgba(var(--p-rgb,0,0,0),1)]"
              : "bg-base-100 text-base-content shadow-[12px_12px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] hover:shadow-[20px_20px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]"
          }`}
          onClick={loadAndScan}
          disabled={isScanning || !stealthKeys}
        >
          <span className="text-4xl">🔍</span>
          <span className="font-heading font-black uppercase tracking-widest text-[10px]">
            {isScanning ? "Deep Scanning..." : "Network Deep Scan"}
          </span>
        </button>

        <button
          className={`p-10 rounded-[40px] border-4 border-base-content flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-2 active:translate-y-0 ${
            isSubscribed
              ? "bg-success text-base-100 shadow-[12px_12px_0px_0px_rgba(var(--su-rgb,0,0,0),1)]"
              : "bg-base-100 text-base-content shadow-[12px_12px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] hover:shadow-[20px_20px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]"
          }`}
          onClick={() => setIsSubscribed((v) => !v)}
        >
          <span className="text-4xl">{isSubscribed ? "📡" : "🌑"}</span>
          <span className="font-heading font-black uppercase tracking-widest text-[10px]">
            {isSubscribed ? "Protocol Online" : "Initialize Link"}
          </span>
        </button>

        <button
          className={`p-10 rounded-[40px] border-4 border-base-content flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-2 active:translate-y-0 ${
            isLoadingBalances
              ? "bg-secondary text-base-100 shadow-[12px_12px_0px_0px_rgba(var(--s-rgb,0,0,0),1)] animate-pulse"
              : "bg-base-100 text-base-content shadow-[12px_12px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] hover:shadow-[20px_20px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]"
          } disabled:opacity-20`}
          onClick={() => loadBalances()}
          disabled={isLoadingBalances || ownedAddresses.length === 0}
        >
          <span className="text-4xl">💰</span>
          <span className="font-heading font-black uppercase tracking-widest text-[10px]">
            {isLoadingBalances ? "Syncing..." : "Sync Balances"}
          </span>
        </button>
      </div>

      {/* 2. Discovered Identity Nodes */}
      {ownedAddresses.length > 0 && (
        <div className="space-y-12">
          <div className="flex items-center justify-between px-4">
            <div className="flex flex-col gap-1">
              <label className="sharp-label !mb-0 text-xl">
                Controlled Identity Nodes
              </label>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Matches found in the abyss
              </p>
            </div>
            <div className="bg-primary text-base-100 font-black px-6 py-2 rounded-full border-4 border-base-content text-sm shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]">
              {ownedAddresses.length} NODES
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10">
            {ownedAddresses.map((entry) => (
              <div
                key={entry.id}
                className="bg-base-100 border-4 border-base-content p-10 rounded-[40px] shadow-[32px_32px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-colors duration-500"></div>

                <div className="relative z-10 space-y-10">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-[0_0_12px_rgba(var(--su-rgb,0,0,0),1)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-success">
                          MATCH VERIFIED & LINKED
                        </span>
                      </div>
                      <code className="text-3xl font-black font-mono block break-all tracking-tighter leading-none selection:bg-primary selection:text-base-100">
                        {entry.stealthAddress}
                      </code>
                    </div>

                    <div className="text-left md:text-right min-w-[200px]">
                      <label className="sharp-label !mb-0 opacity-40">
                        Network Liquidity
                      </label>
                      <div className="text-6xl font-heading font-black tracking-tighter text-primary">
                        {entry.balance ?? "0.0"}{" "}
                        <span className="text-2xl opacity-40 font-black">
                          ETH
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-t-4 border-base-content pt-10">
                    {/* Access & Secrets */}
                    <div className="space-y-6">
                      <label className="sharp-label">Access Interface</label>
                      <div className="flex flex-wrap gap-4">
                        <button
                          className={`sharp-button !py-4 flex items-center gap-2 transition-transform active:scale-95 ${
                            revealedKeys.has(entry.id)
                              ? "!bg-error !text-base-100 shadow-[8px_8px_0px_0px_rgba(var(--er-rgb,0,0,0),1)]"
                              : "!bg-secondary !text-base-100 shadow-[8px_8px_0px_0px_rgba(var(--s-rgb,0,0,0),1)]"
                          }`}
                          onClick={() => toggleRevealKey(entry.id)}
                        >
                          {revealedKeys.has(entry.id) ? (
                            <>
                              <span className="text-lg">🔒</span>
                              <span>SEAL KEY</span>
                            </>
                          ) : (
                            <>
                              <span className="text-lg">🔑</span>
                              <span>REVEAL SECRET</span>
                            </>
                          )}
                        </button>
                        <button
                          className="sharp-button !bg-base-content !text-base-100 !py-4 shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),0.2)] flex items-center gap-2 transition-transform active:scale-95 hover:shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]"
                          onClick={() =>
                            handleCopyAddr(entry.id, entry.stealthAddress)
                          }
                        >
                          {copiedAddrId === entry.id ? (
                            <>
                              <span className="text-success">✅</span>
                              <span className="text-success">COPIED!</span>
                            </>
                          ) : (
                            <>
                              <span>📋</span>
                              <span>COPY ADDR</span>
                            </>
                          )}
                        </button>
                        <button
                          className="sharp-button !bg-transparent !text-error !border-error !py-4 flex items-center gap-2 transition-all hover:!bg-error hover:!text-base-100 shadow-[8px_8px_0px_0px_rgba(var(--er-rgb,0,0,0),0.1)] hover:shadow-[8px_8px_0px_0px_rgba(var(--er-rgb,0,0,0),1)]"
                          onClick={() => handleRemoveAnnouncement(entry.id)}
                        >
                          <span>🗑️</span>
                          <span>PURGE</span>
                        </button>
                      </div>

                      {revealedKeys.has(entry.id) && (
                        <div className="bg-error/5 border-4 border-error p-8 rounded-[32px] animate-in zoom-in-95 duration-200 shadow-[24px_24px_0px_0px_rgba(var(--er-rgb,0,0,0),0.15)] space-y-6">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-error">
                              Spending Sequence (PK)
                            </label>
                            <span className="bg-error text-base-100 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                              Active Exposure
                            </span>
                          </div>
                          <div className="relative group/pk">
                            <code className="block bg-base-100 p-8 rounded-[24px] border-4 border-error font-mono text-xs break-all font-black selection:bg-error selection:text-base-100 leading-relaxed">
                              {entry.privateKey}
                            </code>
                            <button
                              className="tooltip tooltip-left absolute top-4 right-4 w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center border-2 border-error/20 hover:bg-error hover:text-base-100 transition-all opacity-40 group-hover/pk:opacity-100"
                              onClick={() =>
                                handleCopyPk(entry.id, entry.privateKey)
                              }
                              data-tip={copiedKeyId === entry.id ? "Copied!" : "Copy Private Key"}
                              aria-label="Copy private key"
                            >
                              {copiedKeyId === entry.id ? "✅" : "📋"}
                            </button>
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-error/40 text-center">
                            🚨 SECURITY ADVISORY: THIS KEY GRANTS TOTAL CONTROL.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Sweep Control */}
                    <div className="space-y-6">
                      <label className="sharp-label">Withdrawal Sequence</label>
                      <div className="flex flex-col gap-6">
                        <div className="relative group/input">
                          <input
                            type="text"
                            className="sharp-input !text-xs !py-6 !bg-base-200 border-4 focus:!bg-base-100 transition-all"
                            placeholder="Target Address 0x..."
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
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-20 uppercase tracking-widest pointer-events-none group-focus-within/input:opacity-0 transition-opacity">
                            DESTINATION
                          </span>
                        </div>
                        <button
                          className="sharp-button !bg-success !text-base-100 !py-6 font-black uppercase text-sm tracking-[0.3em] shadow-[12px_12px_0px_0px_rgba(var(--su-rgb,0,0,0),0.3)] hover:shadow-[16px_16px_0px_0px_rgba(var(--su-rgb,0,0,0),1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                          disabled={sweepState[entry.id]?.sending}
                          onClick={() => sweepFunds(entry)}
                        >
                          {sweepState[entry.id]?.sending ? (
                            <span className="flex items-center justify-center gap-3">
                              <span className="loading loading-sm" />
                              SIGNALING...
                            </span>
                          ) : (
                            "⚡ EXECUTE SWEEP"
                          )}
                        </button>
                      </div>

                      {sweepState[entry.id]?.txHash && (
                        <div className="bg-success text-base-100 border-4 border-base-content p-6 rounded-[24px] flex flex-col items-center gap-2 shadow-[12px_12px_0px_0px_rgba(var(--su-rgb,0,0,0),1)]">
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            TRANSACTION BROADCAST
                          </span>
                          <a
                            href={`${currentNetwork.explorerUrl}/tx/${sweepState[entry.id].txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[10px] underline decoration-dotted underline-offset-4 break-all text-center"
                          >
                            {sweepState[entry.id].txHash}
                          </a>
                        </div>
                      )}

                      {sweepState[entry.id]?.error && (
                        <div className="bg-error text-base-100 border-4 border-base-content p-4 text-[10px] font-black uppercase tracking-widest text-center shadow-[8px_8px_0px_0px_rgba(var(--er-rgb,0,0,0),1)]">
                          Error: {sweepState[entry.id].error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Global Pulse Registry */}
      <div className="flex flex-col gap-6">
        {status && (
          <div className="bg-primary/5 border-4 border-base-content rounded-[32px] p-6 flex items-center justify-center gap-4 animate-in slide-in-from-top-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)]">
            <span className="text-primary text-xl font-black">◈</span>
            <p className="font-heading font-black uppercase tracking-[0.4em] text-[10px] text-base-content opacity-40">
              {status}
            </p>
          </div>
        )}

        <details className="group bg-base-200 rounded-[40px] border-4 border-base-content shadow-[32px_32px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] overflow-hidden">
          <summary className="p-12 cursor-pointer hover:bg-base-content hover:text-base-100 transition-all flex items-center justify-between text-[11px] font-black font-heading text-base-content/40 uppercase tracking-[0.6em]">
            Protocol Traffic Explorer ({announcements.length} SIGNALS)
            <span className="group-open:rotate-180 transition-transform text-3xl text-primary font-black">
              ↓
            </span>
          </summary>
          <div className="p-12 pt-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-base-content uppercase font-heading font-black text-[10px] tracking-[0.3em] opacity-40">
                  <th className="py-8 px-4">Stealth Address</th>
                  <th className="py-8 px-4">Tag</th>
                  <th className="py-8 px-4">Stealth Key (E)</th>
                  <th className="py-8 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann) => (
                  <AnnouncementRow
                    key={ann.id}
                    ann={ann}
                    isOwned={ownedIds.has(ann.id)}
                    onRemove={handleRemoveAnnouncement}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ScanAnnouncements;
