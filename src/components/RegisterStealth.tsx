/**
 * RegisterStealth Component
 * Allows the user to publish their Dual Stealth Public Keys (Spending & Viewing) on Gun.
 */

import React, { useState, useEffect } from "react";
import { useShogun } from "shogun-button-react";
import { publishStealthKeys, getStealthKeys } from "../lib/gunStealth";
import {
  deriveStealthKeysFromGun,
  gunPairToEthAddress,
  StealthKeys,
} from "../lib/stealthCore";

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
  const { isLoggedIn, core } = useShogun();
  const [stealthKeys, setStealthKeys] = useState<StealthKeys | null>(null);
  const [ethAddress, setEthAddress] = useState<string>("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedSpending, setCopiedSpending] = useState(false);
  const [copiedViewing, setCopiedViewing] = useState(false);
  const [copiedEth, setCopiedEth] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);
  const [alias, setAlias] = useState("");
  const [userPub, setUserPub] = useState<string>("");

  useEffect(() => {
    if (!isLoggedIn || !core) return;

    const tryDeriveKeys = () => {
      const gun = (core as any)?.gun;
      const userPair =
        (core as any)?._user?._.sea ||
        gun?.user?.()?._.sea ||
        (core as any)?.db?.user?._.sea ||
        null;

      if (userPair?.epriv) {
        setUserPub(userPair.pub);
        const keys = deriveStealthKeysFromGun(userPair.epriv);
        setStealthKeys(keys);
        setEthAddress(gunPairToEthAddress(userPair.epriv));
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

  // Check if already registered
  useEffect(() => {
    if (!userPub || !(core as any)?.gun || !stealthKeys) return;
    getStealthKeys((core as any).gun, userPub).then((entry) => {
      if (entry?.spendingPubKey === stealthKeys.spending.pub)
        setIsRegistered(true);
    });
  }, [userPub, core, stealthKeys]);

  const handlePublish = async () => {
    if (!userPub || !stealthKeys || !(core as any)?.gun) return;
    setIsPublishing(true);
    setStatus(null);
    try {
      await publishStealthKeys((core as any).gun, userPub, stealthKeys, alias);
      setIsRegistered(true);
      setStatus({
        type: "success",
        msg: "✅ Dual stealth keys published on Gun!",
      });
    } catch (e: any) {
      setStatus({ type: "error", msg: `Error: ${e.message}` });
    } finally {
      setIsPublishing(false);
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
      {/* Status Banner */}
      {isRegistered && (
        <div className="bg-success text-success-content rounded-full px-6 py-3 flex items-center justify-center gap-3 shadow-lg shadow-success/10">
          <CheckIcon />
          <span className="font-heading font-extrabold text-xs uppercase tracking-widest">
            Identity Registered on Gun
          </span>
        </div>
      )}

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
      <div className="bg-primary/5 rounded-[28px] p-8 border border-primary/10">
        <label className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em] block mb-4">
          Neural Identity (Shogun ID)
        </label>
        <div className="flex items-center gap-4">
          <code className="flex-1 text-sm font-mono text-primary font-bold break-all leading-relaxed">
            {ethAddress}
          </code>
          <button
            className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all shrink-0"
            onClick={() => copy(ethAddress, setCopiedEth)}
          >
            {copiedEth ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <p className="text-[10px] text-primary/40 mt-4 leading-relaxed font-medium">
          Derived from your Gun pair. Used as a unique identifier for relay
          communication across the Shogun Ecosystem.
        </p>
      </div>

      {/* Alias & Action */}
      <div className="flex flex-col md:flex-row gap-6 items-end pt-4">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-xs font-bold opacity-40 tracking-widest uppercase ml-4">
            Display Alias (optional)
          </label>
          <input
            type="text"
            className="input-material w-full"
            placeholder="e.g. alice.shogun"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </div>

        <button
          className={`btn-primary-bloom px-10 h-[50px] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <>
              <span>📡</span>
              <span>
                {isRegistered ? "Update Registry" : "Secure Registry"}
              </span>
            </>
          )}
        </button>
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
