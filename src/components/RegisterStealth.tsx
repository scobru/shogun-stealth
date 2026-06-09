/**
 * RegisterStealth Component
 * Allows the user to publish their Dual Stealth Public Keys (Spending & Viewing) on Gun.
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { ethers } from "ethers";
import { useNetwork } from "../lib/NetworkContext";
import { publishStealthKeys, getStealthKeys } from "../lib/gunStealth";
import {
  deriveStealthKeysFromZen,
  StealthKeys,
} from "../lib/stealthCore";
import {
  registerOnChain,
  registerOnChainOnBehalf,
  getOnChainStealthKeys,
} from "../lib/stealthContract";

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4 text-success"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export const RegisterStealth: React.FC = () => {
  const { isLoggedIn, db, userPub: authPub } = useAuth();
  const { currentNetwork } = useNetwork();
  const [stealthKeys, setStealthKeys] = useState<StealthKeys | null>(null);
  const [userPub, setUserPub] = useState<string | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnChain, setIsOnChain] = useState(false);
  const [alias, setAlias] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState<{ type: string; msg: string } | null>(
    null,
  );
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isRegisteringOnChain, setIsRegisteringOnChain] = useState(false);
  const [deriveError, setDeriveError] = useState<string | null>(null);
  const [copiedSpending, setCopiedSpending] = useState(false);
  const [copiedViewing, setCopiedViewing] = useState(false);
  const [copiedEth, setCopiedEth] = useState(false);
  const [revealedNull, setRevealedNull] = useState(false);
  const [signer, setSigner] = useState<any>(null);

  const zen = db?.zen;

  useEffect(() => {
    if (!isLoggedIn || !db) return;

    const tryDeriveKeys = async () => {
      try {
        const pair = db.pair;
        if (!pair) {
          setDeriveError("No key pair found. Please log out and log back in.");
          return;
        }
        const seed = pair.epriv || pair.priv;
        if (!seed) {
          setDeriveError(`Key pair is missing epriv/priv field. Found keys: ${Object.keys(pair).join(", ")}`);
          return;
        }
        setUserPub(pair.pub);
        const keys = await deriveStealthKeysFromZen(seed);
        setStealthKeys(keys);
        const neuralWallet = new ethers.Wallet(keys.neuralPriv);
        setEthAddress(neuralWallet.address);
      } catch (e) {
        setDeriveError(`Failed to derive stealth keys: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    tryDeriveKeys();
  }, [isLoggedIn, db]);

  useEffect(() => {
    if (!zen || !userPub || !stealthKeys) return;
    getStealthKeys(zen, userPub).then((entry) => {
      if (entry?.spendingPubKey === stealthKeys.spending.pub)
        setIsRegistered(true);
    });
  }, [userPub, zen, stealthKeys]);

  // Check on-chain registry
  useEffect(() => {
    if (!ethAddress) return;
    
    const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
    getOnChainStealthKeys(
      currentNetwork.registryAddress,
      provider,
      ethAddress,
    ).then((keys) => {
      if (keys) setIsOnChain(true);
      else setIsOnChain(false);
    });
  }, [ethAddress, currentNetwork]);

  const handlePublish = async () => {
    if (!userPub || !stealthKeys || !db) return;
    setIsPublishing(true);
    setStatus(null);
    try {
      await publishStealthKeys(db.zen, userPub, stealthKeys, alias);
      setIsRegistered(true);
      setStatus({
        type: "success",
        msg: "✅ Dual stealth keys published on Zen! SYNCING...",
      });
      // Trigger on-chain check
      if (ethAddress) {
        getOnChainStealthKeys(
          currentNetwork.registryAddress,
          new ethers.JsonRpcProvider(currentNetwork.rpcUrl),
          ethAddress,
        ).then((keys) => {
          if (keys) setIsOnChain(true);
        });
      }
    } catch (e: unknown) {
      setStatus({
        type: "error",
        msg: `Error: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConnectWallet = async () => {
    if (!(window as any).ethereum) {
      setStatus({
        type: "error",
        msg: "MetaMask not detected. Please install it.",
      });
      return;
    }
    try {
      setStatus({
        type: "info",
        msg: `Connecting to ${currentNetwork.name}...`,
      });
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();

      const expectedChainId = BigInt(currentNetwork.chainId);
      const hexChainId = "0x" + currentNetwork.chainId.toString(16);

      if (network.chainId !== expectedChainId) {
        setStatus({
          type: "info",
          msg: `Switching to ${currentNetwork.name}...`,
        });
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: hexChainId }],
          });
        } catch (switchError: unknown) {
          if (
            switchError &&
            typeof switchError === "object" &&
            "code" in switchError &&
            (switchError as { code: unknown }).code === 4902
          ) {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: hexChainId,
                  chainName: currentNetwork.name,
                  rpcUrls: [currentNetwork.rpcUrl],
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  blockExplorerUrls: [currentNetwork.explorerUrl],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      await provider.send("eth_requestAccounts", []);
      const newSigner = await provider.getSigner();
      setSigner(newSigner);
      setIsWalletConnected(true);
      setStatus({
        type: "success",
        msg: `Wallet connected to ${currentNetwork.name}! You can now register on-chain.`,
      });
    } catch (e: unknown) {
      setStatus({
        type: "error",
        msg: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  const handleRegisterOnChain = async () => {
    setStatus(null);
    if (!stealthKeys) {
      setStatus({ type: "error", msg: "Error: Stealth keys not generated." });
      return;
    }
    
    let activeSigner = signer;

    if (!activeSigner && (window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(currentNetwork.chainId)) {
        setStatus({
          type: "error",
          msg: `Error: Please switch to ${currentNetwork.name} network.`,
        });
        return;
      }
      activeSigner = await provider.getSigner();
      setSigner(activeSigner);
    }

    if (!activeSigner) {
      setStatus({
        type: "error",
        msg: "Error: No wallet detected. Please connect MetaMask or compatible wallet.",
      });
      return;
    }

    setIsRegisteringOnChain(true);
    try {
      // Use the "On Behalf" flow:
      // 1. neuralPriv signs the keys
      // 2. MetaMask (signer) pays the gas
      await registerOnChainOnBehalf(
        currentNetwork.registryAddress,
        activeSigner,
        stealthKeys.neuralPriv,
        stealthKeys,
      );

      setIsOnChain(true);
      setStatus({
        type: "success",
        msg: "✅ Stealth keys registered for Null Route Identity on-chain!",
      });
    } catch (e: unknown) {
      console.error("Chain registration error:", e);
      setStatus({
        type: "error",
        msg: `Chain Error: ${e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"}`,
      });
    } finally {
      setIsRegisteringOnChain(false);
    }
  };

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="card bg-base-200 p-6 text-center">
        <p className="text-base-content/60">
          🔐 Login required to register your stealth address.
        </p>
      </div>
    );
  }

  if (deriveError) {
    return (
      <div className="card bg-base-200 p-6 text-center">
        <p className="text-error font-bold mb-2">Key derivation failed</p>
        <p className="text-base-content/60 text-xs">{deriveError}</p>
      </div>
    );
  }

  if (!stealthKeys) {
    return (
      <div className="card bg-base-200 p-6 text-center">
        <span className="loading loading-spinner loading-md"></span>
        <p className="text-base-content/60 mt-2">Deriving stealth keys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banners */}
      <div className="flex flex-wrap gap-4 justify-center">
        {isRegistered && (
          <div className="bg-success/10 text-success border border-success/20 rounded-full px-6 py-2.5 flex items-center gap-3 shadow-sm">
            <CheckIcon />
            <span className="font-heading font-extrabold text-[10px] uppercase tracking-widest">
              Gun Identity Ready
            </span>
          </div>
        )}
        {isOnChain && (
          <div className="bg-primary/10 text-primary border border-primary/20 rounded-full px-6 py-2.5 flex items-center gap-3 shadow-sm">
            <CheckIcon />
            <span className="font-heading font-extrabold text-[10px] uppercase tracking-widest">
              On-Chain Identity Ready
            </span>
          </div>
        )}
      </div>

      {/* Keys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spending Public Key */}
        <div className="surface-container transition-all hover:bg-base-300">
          <label className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] block mb-4">
            Spending Key (S)
          </label>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-xs break-all font-mono opacity-80 leading-relaxed">
              {stealthKeys.spending.pub}
            </code>
            <button
              className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all shrink-0"
              onClick={() => copy(stealthKeys.spending.pub, setCopiedSpending)}
            >
              {copiedSpending ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <p className="text-[10px] opacity-30 mt-6 leading-relaxed font-medium">
            Cryptographic root for spending. Generated addresses require the
            corresponding private key to unlock funds.
          </p>
        </div>

        {/* Viewing Public Key */}
        <div className="surface-container transition-all hover:bg-base-300">
          <label className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] block mb-4">
            Viewing Key (V)
          </label>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-xs break-all font-mono opacity-80 leading-relaxed">
              {stealthKeys.viewing.pub}
            </code>
            <button
              className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all shrink-0"
              onClick={() => copy(stealthKeys.viewing.pub, setCopiedViewing)}
            >
              {copiedViewing ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <p className="text-[10px] opacity-30 mt-6 leading-relaxed font-medium">
            Safe to share with scanning nodes. Allows detection of incoming
            payments without compromising spending security.
          </p>
        </div>
      </div>

      {/* Ethereum Identity Address */}
      <div className="bg-primary/5 rounded-[40px] p-10 border-4 border-base-content shadow-[32px_32px_0px_0px_rgba(var(--p-rgb,0,0,0),0.1)] relative">
        <label className="sharp-label !text-primary">
          Master Null Route Identity (ID)
        </label>
        <div className="flex flex-col md:flex-row items-center gap-6 mt-6">
          <code className="flex-1 text-2xl font-black font-mono text-primary break-all leading-none tracking-tighter selection:bg-primary selection:text-base-100">
            {ethAddress}
          </code>
          <div className="flex gap-3">
            <button
              className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border-4 border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-all shrink-0 shadow-[8px_8px_0px_0px_rgba(var(--p-rgb,0,0,0),0.1)]"
              onClick={() => copy(ethAddress ?? "", setCopiedEth)}
            >
              {copiedEth ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),0.1)] border-4 ${revealedNull ? "bg-error text-base-100 border-error" : "bg-base-300 border-base-content/20 text-base-content"}`}
              onClick={() => setRevealedNull(!revealedNull)}
              title={revealedNull ? "Seal Secret" : "Expose Secret"}
            >
              {revealedNull ? "🔒" : "🔑"}
            </button>
          </div>
        </div>

        {revealedNull && stealthKeys?.neuralPriv && (
          <div className="mt-8 bg-error/5 border-4 border-error p-8 rounded-[32px] animate-in zoom-in-95 duration-200">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-error mb-4 block">
              Master Spending Secret (PK)
            </label>
            <code className="block bg-base-100 p-6 rounded-2xl border-4 border-base-content font-mono text-sm break-all font-black selection:bg-error selection:text-base-100">
              {stealthKeys.neuralPriv}
            </code>
            <p className="text-[10px] font-bold text-error mt-4 uppercase tracking-widest opacity-60">
              ⚠️ NEVER SHARE THIS SECRET. It grants full control over your
              Null Route Identity.
            </p>
          </div>
        )}

        <p className="text-[10px] text-primary/40 mt-8 leading-relaxed font-medium uppercase tracking-widest">
          Derived from your Gun pair. Used as a unique identifier for relay
          communication across the Zen Ecosystem.
        </p>
      </div>

      {/* Alias & Action */}
      <div className="flex flex-col md:flex-row gap-8 items-end pt-8">
        <div className="flex-1 space-y-3 w-full">
          <label className="text-[10px] font-bold opacity-40 tracking-[0.2em] uppercase ml-6">
            Null Alias
          </label>
          <input
            type="text"
            className="input-material w-full !bg-base-200 border-2 border-transparent focus:border-primary/20 h-[56px]"
            placeholder="e.g. null_neuro"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button
            className="btn-primary-bloom w-full sm:w-auto disabled:opacity-30"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <>
                <span className="text-xl">📡</span>
                <span>
                  {isRegistered ? "Sync Identity" : "Publish Identity"}
                </span>
              </>
            )}
          </button>

          {!signer && !isWalletConnected ? (
            <button
              className="btn-secondary-bloom w-full sm:w-auto"
              onClick={handleConnectWallet}
            >
              <span className="text-xl">🦊</span>
              <span>Connect Wallet</span>
            </button>
          ) : (
            <button
              className={`w-full sm:w-auto rounded-full px-10 h-[56px] font-heading font-bold uppercase tracking-widest text-xs border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 ${
                isOnChain
                  ? "bg-transparent border-primary/30 text-primary"
                  : "bg-primary text-base-100 border-primary shadow-xl shadow-primary/20"
              } disabled:opacity-30`}
              onClick={handleRegisterOnChain}
              disabled={isRegisteringOnChain}
            >
              {isRegisteringOnChain ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <span className="text-xl">⛓️</span>
                  <span>{isOnChain ? "Regen ID" : "Register On-Chain"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {status && (
        <div
          className={`mt-4 p-4 rounded-2xl text-xs font-medium text-center ${
            status.type === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-error/10 text-error border border-error/20"
          }`}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
};

export default RegisterStealth;
