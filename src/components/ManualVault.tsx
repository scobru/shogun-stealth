import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useNetwork } from "../lib/NetworkContext";

const ManualVault: React.FC = () => {
  const { currentNetwork } = useNetwork();
  const [privateKey, setPrivateKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (privateKey.length === 66 || privateKey.length === 64) {
      try {
        const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
        const wallet = new ethers.Wallet(pk);
        setAddress(wallet.address);
        setError(null);
        fetchBalance(wallet.address);
      } catch (e: any) {
        setAddress("");
        setBalance(null);
        setError("Invalid Private Key format");
      }
    } else {
      setAddress("");
      setBalance(null);
    }
  }, [privateKey]);

  const fetchBalance = async (addr: string) => {
    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
      const bal = await provider.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch (e: any) {
      setError("Failed to fetch balance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!destination || !ethers.isAddress(destination)) {
      setError("Invalid destination address");
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const provider = new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
      const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
      const wallet = new ethers.Wallet(pk, provider);

      const bal = await provider.getBalance(address);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? ethers.parseUnits("1", "gwei");
      const gasLimit = 21000n;

      // Buffer for L1 fees on Base
      const l1Buffer = ethers.parseUnits("0.0001", "ether");
      const totalCost = gasLimit * gasPrice + l1Buffer;

      if (bal <= totalCost) {
        throw new Error("Insufficient balance for gas + L1 fees");
      }

      const tx = await wallet.sendTransaction({
        to: destination,
        value: bal - totalCost,
        gasLimit,
        gasPrice,
      });

      setTxHash(tx.hash);
      fetchBalance(address);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="bg-base-100 border-4 border-base-content p-10 rounded-[40px] shadow-[32px_32px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]">
        <div className="mb-10">
          <label className="sharp-label" htmlFor="privateKey">
            Master Private Key Access
          </label>
          <div className="relative">
            <input
              id="privateKey"
              type={isVisible ? "text" : "password"}
              className="sharp-input w-full text-lg font-mono focus:ring-4 focus:ring-primary/20 pr-16"
              placeholder="0x..."
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              aria-label="Private Key"
            />
            <button
              type="button"
              onClick={() => setIsVisible(!isVisible)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl opacity-50 hover:opacity-100 transition-opacity"
              aria-label={isVisible ? "Hide private key" : "Show private key"}
            >
              {isVisible ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-error mt-4 opacity-60">
            ⚠️ WARNING: Your private key is required to authorize withdrawals.
            It never leaves your browser.
          </p>
        </div>

        {address && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8 items-start justify-between border-t-4 border-base-content pt-10">
              <div className="space-y-3">
                <label className="sharp-label !mb-0">
                  Controlled Base Address
                </label>
                <code className="text-xl font-black font-mono block break-all tracking-tighter">
                  {address}
                </code>
              </div>
              <div className="text-right">
                <label className="sharp-label !mb-0 text-right">
                  Available Balance
                </label>
                <div className="text-5xl font-heading font-black tracking-tighter text-primary">
                  {isLoading ? "..." : (balance ?? "0.0")}{" "}
                  <span className="text-2xl opacity-40">ETH</span>
                </div>
              </div>
            </div>

            <div className="bg-base-200 border-4 border-base-content p-8 rounded-[32px] space-y-6">
              <label className="sharp-label">Sweep to Destination</label>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="relative group/input flex-1">
                  <input
                    type="text"
                    className="sharp-input w-full !text-sm !py-5 !bg-base-200 border-4 focus:!bg-base-100 transition-all font-mono"
                    placeholder="Recipient 0x..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-20 uppercase tracking-widest pointer-events-none group-focus-within/input:opacity-0 transition-opacity">
                    DESTINATION
                  </span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={isSending || !balance || parseFloat(balance) <= 0}
                  className="sharp-button !bg-primary !text-base-100 px-10 h-[72px] font-black uppercase tracking-widest disabled:opacity-20 shadow-[8px_8px_0px_0px_rgba(var(--p-rgb,0,0,0),0.3)] hover:shadow-[12px_12px_0px_0px_rgba(var(--p-rgb,0,0,0),1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none flex items-center justify-center gap-3"
                >
                  {isSending ? (
                    <>
                      <span className="loading loading-sm" />
                      <span>SIGNALING...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>EXECUTE SWEEP</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="bg-error text-error-content border-2 border-base-content p-4 text-[10px] font-black uppercase tracking-widest text-center shadow-[8px_8px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]">
                  {error}
                </div>
              )}

              {txHash && (
                <div className="bg-success text-success-content border-2 border-base-content p-6 flex flex-col items-center gap-2 shadow-[12px_12px_0px_0px_rgba(var(--bc-rgb,0,0,0),1)]">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    BROADCAST SUCCESS
                  </span>
                  <a
                    href={`${currentNetwork.explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs underline decoration-dotted underline-offset-4 break-all text-center"
                  >
                    {txHash}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-6 flex items-start gap-4">
        <span className="text-2xl">🧠</span>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Pro Tip
          </p>
          <p className="text-xs font-medium opacity-60 leading-relaxed">
            This vault allows you to manage any stealth address directly. If you
            discovered funds in the "Scan" tab, you can use the revealed key
            here for more control.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualVault;
