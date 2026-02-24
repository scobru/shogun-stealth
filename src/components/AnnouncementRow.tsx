import React from "react";
import { StealthAnnouncement } from "../lib/stealthCore";

interface AnnouncementRowProps {
  ann: StealthAnnouncement;
  isOwned: boolean;
  onRemove: (id: string) => void;
}

const AnnouncementRow: React.FC<AnnouncementRowProps> = React.memo(({ ann, isOwned, onRemove }) => {
  return (
    <tr
      className={`group/row border-b-2 border-base-content/5 hover:bg-base-100 transition-colors ${isOwned ? "bg-success/5" : ""}`}
    >
      <td className="py-8 px-4 font-mono text-sm font-black">
        {ann.stealthAddress.slice(0, 18)}...
      </td>
      <td className="py-8 px-4">
        <span className="bg-base-300 px-4 py-2 rounded-xl text-[10px] font-black border-2 border-base-content">
          {ann.viewTag || "0x-"}
        </span>
      </td>
      <td className="py-8 px-4 font-mono text-xs opacity-40">
        {ann.ephemeralPubKey.slice(0, 24)}...
      </td>
      <td className="py-8 px-4 text-right">
        <div className="flex items-center justify-end gap-3">
          <span
            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border-2 ${isOwned ? "bg-success text-base-100 border-base-content" : "bg-base-content/5 text-base-content/20 border-base-content/5"}`}
          >
            {isOwned ? "Authorized" : "Unknown"}
          </span>
          <button
            onClick={() => onRemove(ann.id)}
            className="w-10 h-10 rounded-xl bg-error/10 text-error border-2 border-error/20 hover:bg-error hover:text-white transition-all flex items-center justify-center text-xs opacity-0 group-hover/row:opacity-100"
            title="Delete Signal"
            aria-label="Delete signal"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
});

export default AnnouncementRow;
