/**
 * SendStealth Component
 * Allows a user to generate a one-time stealth address for a recipient
 * and broadcast the signal to GunDB or On-Chain.
 */

import React, { useState } from "react";
import { useShogun } from "shogun-button-react";
import { ethers } from "ethers";
import {
  generateStealthAddress,
  deriveStealthKeysFromGun,
  gunPairToEthAddress,
  type StealthRegistryEntry,
} from "../lib/stealthCore";
import {
  getStealthKeys,
  getAllRegistered,
  publishAnnouncement,
} from "../lib/gunStealth";
import { sendEthOnChain, getOnChainStealthKeys } from "../lib/stealthContract";
import { useNetwork } from "../lib/NetworkContext";
import { isValidEthAmount, isValidRecipient } from "../lib/validation";

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
  const { currentNetwork } = useNetwork();
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
  const [isCopied, setIsCopied] = useState(false);

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [announced, setAnnounced] = useState(false);
  const [amount, setAmount] = useState("0.01"); // Default amount
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);
  const [step, setStep] = useState(1);
  const [toll, setToll] = useState<string>("0");
  const [fundingSource, setFundingSource] = useState<"metamask" | "internal">(
    "metamask",
  );
  const [senderEthAddress, setSenderEthAddress] = useState<string | null>(null);
  const [senderKeys, setSenderKeys] = useState<any | null>(null);
  const [senderBalance, setSenderBalance] = useState<string>("0");

  const gun = (core as any)?.gun;

  // Deriv sender identity
  React.useEffect(() => {
    if (!isLoggedIn || !core) return;
    const g = (core as any)?.gun;
    const userPair = (core as any)?._user?._.sea || g?.user?.()?._.sea || null;

    if (userPair?.epriv) {
      const addr = gunPairToEthAddress(userPair.epriv);
      setSenderEthAddress(addr);
      const keys = deriveStealthKeysFromGun(userPair.epriv);
      setSenderKeys(keys);
    }
  }, [isLoggedIn, core]);

  // Fetch contract toll (efee)
  React.useEffect(() => {
    const fetchToll = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
        const { getPaymentForwarderContract } =
          await import("../lib/contracts");
        const forwarder = getPaymentForwarderContract(
          currentNetwork.forwarderAddress,
          provider,
        );
        const t = await forwarder.toll();
        setToll(ethers.formatEther(t));
      } catch (e) {
        console.error("Failed to fetch toll:", e);
      }
    };
    fetchToll();
  }, [currentNetwork]);

  // Monitor internal balance
  React.useEffect(() => {
    if (!senderEthAddress) return;
    const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
    const updateBalance = async () => {
      const b = await provider.getBalance(senderEthAddress);
      setSenderBalance(ethers.formatEther(b));
    };
    updateBalance();
    const interval = setInterval(updateBalance, 5000);
    return () => clearInterval(interval);
  }, [senderEthAddress, currentNetwork]);

  const loadRegistry = async () => {
    if (!gun) return;
    setLoadingRegistry(true);
    const all = await getAllRegistered(gun);
    setRegisteredUsers(all);
    setLoadingRegistry(false);
  };

  const lookupRecipient = async () => {
    const input = recipientPub.trim();
    if (!isValidRecipient(input)) {
      setStatus({ type: "error", msg: "Invalid Recipient: Must be a valid address or Shogun ID." });
      return;
    }
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
          provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
        }

        const chainKeys = await getOnChainStealthKeys(
          currentNetwork.registryAddress,
          provider,
          input,
        );
        if (chainKeys) {
          setRecipientEntry({
            pub: input,
            alias: `Shogun ID: ${input.slice(0, 6)}...`,
            spendingPubKey: chainKeys.spending,
            viewingPubKey: chainKeys.viewing,
            updatedAt: Date.now(),
          });
          setStatus({
            type: "success",
            msg: `🎯 Found on ${currentNetwork.name} Registry!`,
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

    if (mode === "chain" && !isValidEthAmount(amount)) {
      setStatus({ type: "error", msg: "Invalid Amount: Please enter a valid positive number." });
      return;
    }

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

        if (fundingSource === "internal") {
          if (!senderKeys?.neuralPriv)
            throw new Error("Internal keys not found.");
          const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
          signer = new ethers.Wallet(senderKeys.neuralPriv, provider);

          // Check balance - need at least amount + toll + some gas
          const required = ethers.parseEther(amount) + ethers.parseEther(toll);
          const currentB = await provider.getBalance(senderEthAddress!);
          if (currentB < required) {
            throw new Error(
              `Insufficient Shogun ID Balance. Required: ${ethers.formatEther(required)} ETH`,
            );
          }
        }

        // Fallback to MetaMask if core.signer is not available and source is metamask
        if (
          !signer &&
          (window as any).ethereum &&
          fundingSource === "metamask"
        ) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          signer = await provider.getSigner();
        }

        if (!signer) throw new Error("Wallet not connected.");

        const txHash = await sendEthOnChain(
          currentNetwork.forwarderAddress,
          signer,
          {
            receiver: stealthAddress,
            ephemeralPubKey,
            viewTag,
            amount,
          },
        );

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

  const handleFundIdentity = async () => {
    if (!senderEthAddress || !(window as any).ethereum) return;

    if (!isValidEthAmount(amount)) {
      setStatus({ type: "error", msg: "Invalid Amount: Please enter a valid positive number." });
      return;
    }

    setIsFunding(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: senderEthAddress,
        value: ethers.parseEther(amount),
      });
      setStatus({
        type: "success",
        msg: `Identity funding broadcasted! TX: ${tx.hash.slice(0, 8)}`,
      });
    } catch (e: any) {
      setStatus({ type: "error", msg: e.message });
    } finally {
      setIsFunding(false);
    }
  };

  const handleDirectTransfer = async () => {
    if (!stealthAddress || !(window as any).ethereum) {
      setStatus({ type: "error", msg: "MetaMask not detected." });
      return;
    }

    if (!isValidEthAmount(amount)) {
      setStatus({ type: "error", msg: "Invalid Amount: Please enter a valid positive number." });
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
    <div className="space-y-12 pb-20">
      {/* 1. Recipient Lookup */}
      <div
        className={`bg-base-100 border-4 border-base-content p-10 rounded-[40px] shadow-[32px_32px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] transition-all ${step >= 1 ? "opacity-100" : "opacity-30 grayscale"}`}
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-[20px] bg-primary text-base-100 flex items-center justify-center font-black font-heading text-2xl border-4 border-base-content shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] shrink-0">
            01
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black font-heading uppercase tracking-tighter">
              Target Recipient
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
              Identify the destination node
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          <input
            type="text"
            className="sharp-input flex-1 font-mono !text-lg"
            placeholder="Shogun ID or 0x address..."
            value={recipientPub}
            onChange={(e) => setRecipientPub(e.target.value)}
            aria-label="Recipient Shogun ID or Address"
          />
          <button
            className={`sharp-button !bg-primary !text-base-100 px-12 h-[72px] font-black uppercase tracking-widest ${isLookingUp ? "animate-pulse" : ""}`}
            onClick={lookupRecipient}
            disabled={isLookingUp || !recipientPub.trim()}
          >
            {isLookingUp ? "SYNCING..." : "IDENTIFY"}
          </button>
        </div>

        <div className="flex justify-between items-center px-2 mb-6">
          <label className="sharp-label !mb-0 opacity-40">
            Discovery Registry (Gun Pulse)
          </label>
          <button
            className="text-[10px] uppercase font-black text-primary hover:tracking-[0.2em] transition-all"
            onClick={loadRegistry}
          >
            {loadingRegistry ? "SYNCING..." : "RELOAD PULSE"}
          </button>
        </div>

        {registeredUsers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {registeredUsers.map((u) => (
              <button
                key={u.pub}
                className="bg-base-200 border-4 border-base-content rounded-[24px] p-6 text-left transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] group"
                onClick={() => setRecipientPub(u.pub)}
              >
                <div className="font-black text-sm truncate mb-2 group-hover:text-primary transition-colors uppercase tracking-tight">
                  {u.alias || "Anonymous Identity"}
                </div>
                <code className="text-[10px] opacity-40 font-mono block truncate font-black">
                  {u.pub}
                </code>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Stealth Forge */}
      <div
        className={`bg-base-100 border-4 border-base-content p-10 rounded-[40px] shadow-[32px_32px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] transition-all ${step >= 2 ? "opacity-100" : "opacity-30 grayscale"}`}
      >
        <div className="flex items-center gap-4 mb-10">
          <div
            className={`w-16 h-16 rounded-[20px] flex items-center justify-center font-black font-heading text-2xl border-4 border-base-content shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] shrink-0 ${step >= 2 ? "bg-secondary text-base-100" : "bg-base-300 opacity-20"}`}
          >
            02
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black font-heading uppercase tracking-tighter">
              Stealth Forge
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
              Calculating one-time destination
            </p>
          </div>
        </div>

        <p className="text-sm font-medium opacity-50 mb-10 leading-relaxed max-w-lg">
          Generating a unique cryptographic alias. Only the owner of the Shogun
          ID above will be able to detect and unlock this signal.
        </p>

        <button
          className="sharp-button !bg-secondary !text-base-100 w-full py-6 flex justify-center items-center gap-4 transition-all hover:scale-[1.01] active:scale-98 shadow-[12px_12px_0px_0px_rgba(var(--s-rgb,0,0,0),0.2)]"
          onClick={generateAddress}
          disabled={isGenerating || step < 2}
        >
          {isGenerating ? (
            <span className="font-black uppercase tracking-widest text-xs animate-pulse">
              Forging...
            </span>
          ) : (
            <>
              <span className="text-2xl">⚔️</span>
              <span className="font-heading font-black uppercase tracking-widest text-xs">
                Authorize Forge Sequence
              </span>
            </>
          )}
        </button>

        {stealthAddress && (
          <div className="mt-10 bg-secondary/5 border-4 border-base-content rounded-[32px] p-10 relative group">
            <div className="flex justify-between items-center mb-6">
              <label className="sharp-label !mb-0 text-secondary">
                Generated Stealth Address
              </label>
              {viewTag && (
                <div className="bg-secondary text-base-100 font-black px-4 py-1.5 rounded-full border-2 border-base-content text-[10px] shadow-[6px_6px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]">
                  TAG: {viewTag}
                </div>
              )}
            </div>
            <code className="text-2xl font-black font-mono text-secondary break-all block leading-tight tracking-tighter pr-12 selection:bg-secondary selection:text-base-100">
              {stealthAddress}
            </code>
            <button
              className="tooltip tooltip-left absolute top-10 right-10 w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center border-2 border-secondary/20 hover:bg-secondary hover:text-base-100 transition-all opacity-40 hover:opacity-100"
              data-tip={isCopied ? "Copied!" : "Copy stealth address"}
              onClick={() => {
                navigator.clipboard.writeText(stealthAddress)
                  .then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  })
                  .catch((e) => console.error(e));
              }}
              aria-label={isCopied ? "Copied!" : "Copy stealth address"}
            >
              {isCopied ? "✅" : "📋"}
            </button>
          </div>
        )}
      </div>

      {/* 3. Send & Announce */}
      <div
        className={`bg-base-100 border-4 border-base-content p-10 rounded-[40px] shadow-[32px_32px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] transition-all ${step >= 3 ? "opacity-100" : "opacity-30 grayscale"}`}
      >
        <div className="flex items-center gap-4 mb-10">
          <div
            className={`w-16 h-16 rounded-[20px] flex items-center justify-center font-black font-heading text-2xl border-4 border-base-content shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] shrink-0 ${step >= 3 ? "bg-accent text-base-100" : "bg-base-300 opacity-20"}`}
          >
            03
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black font-heading uppercase tracking-tighter">
              Protocol Execution
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
              Transfer funds and broadcast signal
            </p>
          </div>
        </div>

        <div className="space-y-10">
          <div className="space-y-8">
            {/* Funding Source Selection */}
            <div className="space-y-4">
              <label className="sharp-label">Transmission Source</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFundingSource("metamask")}
                  disabled={step < 3}
                  className={`sharp-button !py-4 flex flex-col items-center gap-2 transition-all ${fundingSource === "metamask" ? "bg-primary text-base-100 shadow-[8px_8px_0px_0px_rgba(var(--p-rgb,0,0,0),1)]" : "bg-base-300 opacity-60 hover:opacity-100"}`}
                >
                  <span className="text-xl">🦊</span>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    External Wallet
                  </span>
                </button>
                <button
                  onClick={() => setFundingSource("internal")}
                  disabled={step < 3}
                  className={`sharp-button !py-4 flex flex-col items-center gap-2 transition-all ${fundingSource === "internal" ? "bg-primary text-base-100 shadow-[8px_8px_0px_0px_rgba(var(--p-rgb,0,0,0),1)]" : "bg-base-300 opacity-60 hover:opacity-100"}`}
                >
                  <span className="text-xl">🛡️</span>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    Shogun Identity
                  </span>
                </button>
              </div>
            </div>

            {/* Internal Info / Funding */}
            {fundingSource === "internal" && senderEthAddress && (
              <div className="bg-base-200 p-8 rounded-[32px] border-4 border-base-content/10 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">
                      Shogun ID Address
                    </span>
                    <p className="text-xs font-mono font-bold break-all opacity-80">
                      {senderEthAddress}
                    </p>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">
                      Balance
                    </span>
                    <p className="text-xl font-black font-mono text-primary">
                      {parseFloat(senderBalance).toFixed(4)}{" "}
                      <span className="text-[10px] opacity-40">ETH</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleFundIdentity}
                    disabled={isFunding}
                    className="flex-1 sharp-button !py-4 !bg-accent !text-base-100 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isFunding ? (
                      <span className="loading loading-xs" />
                    ) : (
                      "🔋 Fund Shogun ID via MetaMask"
                    )}
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `${currentNetwork.explorerUrl}/address/${senderEthAddress}`,
                      )
                    }
                    className="tooltip tooltip-bottom sharp-button !bg-base-300 !text-base-content p-4 border-4"
                    data-tip="View on block explorer"
                    aria-label="View address on block explorer"
                  >
                    🔎
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="sharp-label">ETH Amplitude (Amount)</label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={step < 3}
                  className="sharp-input !text-4xl font-black font-heading text-center !py-8 pr-12"
                  placeholder="0.01"
                  aria-label="Amount in ETH"
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black opacity-20 uppercase tracking-widest">
                  ETH
                </span>
              </div>
            </div>
          </div>

          <div className="border-t-4 border-base-content pt-10 space-y-8">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <label className="sharp-label !mb-0">
                  Broadcast Pulse to Network
                </label>
                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                  Choose transmission relay method
                </p>
              </div>

              {parseFloat(toll) > 0 && (
                <div className="bg-primary/5 text-primary px-5 py-3 rounded-2xl border-2 border-primary/20 flex flex-col items-end shadow-sm">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                    Contract Toll
                  </span>
                  <span className="text-xs font-black font-mono">
                    +{toll} ETH
                  </span>
                </div>
              )}
            </div>

            {parseFloat(toll) > 0 && (
              <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                <span className="text-xl">⚠️</span>
                <p className="text-[9px] font-bold text-primary uppercase tracking-[0.15em] leading-relaxed">
                  Transmission via contract incurs a {toll} ETH protocol fee for
                  anonymous relay service.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={handleDirectTransfer}
                disabled={fundingSource === "internal" || step < 3}
                className={`sharp-button !py-6 font-black uppercase tracking-[0.2em] transition-all text-xs flex items-center justify-center gap-4 ${fundingSource === "internal" ? "opacity-20 cursor-not-allowed bg-base-300" : "bg-base-content text-base-100 hover:shadow-[12px_12px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]"}`}
              >
                🦊 Direct Send
              </button>

              <button
                onClick={() => broadcastSignal("gun")}
                disabled={isPublishing || announced || step < 3}
                className={`sharp-button !py-6 font-black uppercase tracking-[0.2em] transition-all text-xs flex items-center justify-center gap-4 bg-base-200 border-4 border-base-content text-base-content hover:bg-base-300 hover:shadow-[12px_12px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]`}
              >
                📡 Broadcast Gun
              </button>

              <button
                onClick={() => broadcastSignal("chain")}
                disabled={isPublishing || announced || step < 3}
                className={`sharp-button !py-6 font-black uppercase tracking-[0.2em] transition-all text-xs flex items-center justify-center gap-4 ${announced ? "bg-success text-base-100 shadow-[10px_10px_0px_0px_rgba(var(--su-rgb,0,0,0),0.3)]" : "bg-primary text-base-100 hover:shadow-[12px_12px_0px_0px_rgba(var(--p-rgb,0,0,0),1)]"}`}
              >
                {isPublishing ? (
                  <span className="loading loading-md" />
                ) : announced ? (
                  "⛓️ Chain Synced"
                ) : (
                  "⛓️ Broadcast Chain"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div
          className={`bg-base-100 border-4 border-base-content p-8 rounded-[32px] font-black font-heading text-xs text-center uppercase tracking-[0.3em] shadow-[16px_16px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)] animate-in slide-in-from-bottom-4 ${
            status.type === "success"
              ? "text-success"
              : status.type === "error"
                ? "text-error"
                : "text-primary"
          }`}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
};

export default SendStealth;
