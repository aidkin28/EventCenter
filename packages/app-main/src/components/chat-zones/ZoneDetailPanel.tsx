"use client";

import React, { useState } from "react";
import { X, LogIn, LogOut } from "lucide-react";
import type { ZoneConfig, UserPlacementData } from "./chatZonesUtils";
import { useChatZonesStore } from "@/lib/stores/chatZonesStore";

interface ZoneDetailPanelProps {
  zone: ZoneConfig;
  placements: UserPlacementData[];
  myPlacement: UserPlacementData | null;
  userId: string;
  userName: string;
  onClose: () => void;
}

/** Side panel with join/leave and participant info for a selected zone */
const ZoneDetailPanel: React.FC<ZoneDetailPanelProps> = ({
  zone,
  placements,
  myPlacement,
  userId,
  userName,
  onClose,
}) => {
  const { placeUser, removeMyPlacement, updateNote } = useChatZonesStore();
  const [note, setNote] = useState(myPlacement?.note ?? "");
  const isInThisZone = myPlacement?.zoneId === zone.id;
  const zonePlacements = placements.filter((p) => p.zoneId === zone.id);

  const handleJoin = () => {
    placeUser({
      userId,
      userName,
      zoneId: zone.id,
      note,
    });
  };

  const handleLeave = () => {
    removeMyPlacement();
    setNote("");
  };

  const handleUpdateNote = () => {
    updateNote(note);
  };

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between"
        style={{ backgroundColor: zone.bgColor }}
      >
        <div>
          <h2 className="text-base font-bold" style={{ color: zone.color }}>
            {zone.name}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{zone.description}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Join / Leave */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 space-y-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
          Your note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white dark:bg-slate-800"
          maxLength={120}
        />

        {isInThisZone ? (
          <div className="flex gap-2">
            <button
              onClick={handleUpdateNote}
              className="flex-1 text-sm px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              style={{ backgroundColor: zone.bgColor, color: zone.color }}
            >
              Update Note
            </button>
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Leave
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2.5 rounded-lg font-medium text-white transition-colors cursor-pointer"
            style={{ backgroundColor: zone.color }}
          >
            <LogIn size={14} />
            Join This Zone
          </button>
        )}
      </div>

      {/* Participants */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Participants ({zonePlacements.length})
        </h3>

        {zonePlacements.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No one here yet. Be the first to join!</p>
        ) : (
          <div className="space-y-2">
            {zonePlacements.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: p.userId === userId ? "#ec121f" : "#6366f1" }}
                >
                  {p.userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {p.userName}
                    {p.userId === userId && (
                      <span className="text-xs text-gray-400 ml-1">(you)</span>
                    )}
                  </p>
                  {p.note && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoneDetailPanel;
