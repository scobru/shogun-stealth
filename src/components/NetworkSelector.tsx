import React from "react";
import { useNetwork } from "../lib/NetworkContext";
import { NETWORKS } from "../lib/networks";

export const NetworkSelector: React.FC = () => {
  const { currentNetwork, networkKey, setNetwork } = useNetwork();

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] hidden sm:block">
        Network
      </span>
      <div className="dropdown dropdown-end">
        <label
          tabIndex={0}
          className="flex items-center gap-3 px-4 py-2 bg-base-300/50 hover:bg-base-300 rounded-full cursor-pointer transition-all border border-primary/5 shadow-sm group"
        >
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-bold text-primary uppercase tracking-tighter leading-none mb-0.5">
              Active Node
            </span>
            <span className="text-xs font-bold font-heading tracking-tight leading-none group-hover:text-primary transition-colors">
              {currentNetwork.name}
            </span>
          </div>
          <span className="text-primary opacity-40 group-hover:opacity-100 transition-all text-xs">
            ↓
          </span>
        </label>
        <ul
          tabIndex={0}
          className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 rounded-[24px] w-52 mt-2 border border-primary/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2"
        >
          <div className="px-4 py-2 text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">
            Switch Network
          </div>
          {Object.entries(NETWORKS).map(([key, network]) => (
            <li key={key} className="mt-1">
              <button
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  networkKey === key
                    ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                    : "hover:bg-primary/10 hover:text-primary"
                }`}
                onClick={() => {
                  setNetwork(key);
                  // Close dropdown by blurring active element
                  (document.activeElement as HTMLElement)?.blur();
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{network.name}</span>
                  {networkKey === key && (
                    <span className="badge-dot bg-primary-content h-1.5 w-1.5" />
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
