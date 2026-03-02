"use client";

import React, { useState, useCallback } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { usePanZoom } from "@/src/hooks/usePanZoom";
import { useChatZonesStore } from "@/lib/stores/chatZonesStore";
import { useUserStore } from "@/lib/stores/userStore";
import { ZONES, MAP_WIDTH, MAP_HEIGHT } from "./chatZonesUtils";
import TopicZone from "./TopicZone";
import ZoneDetailPanel from "./ZoneDetailPanel";

/** Main chat zones map with grid background, zones, and pan/zoom */
export default function ChatZonesMap() {
  const { containerRef, style, resetView } = usePanZoom();
  const { placements, myPlacement } = useChatZonesStore();
  const { user } = useUserStore();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const userId = user?.id ?? "anonymous";
  const userName = user?.name ?? "Anonymous";

  const handleSelectZone = useCallback((zoneId: string) => {
    setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId));
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedZoneId(null);
  }, []);

  const selectedZone = ZONES.find((z) => z.id === selectedZoneId);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <button
          onClick={resetView}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          title="Reset view"
        >
          <RotateCcw size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <button
          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm opacity-50 cursor-default"
          title="Scroll to zoom"
        >
          <ZoomIn size={16} className="text-gray-400" />
        </button>
        <button
          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm opacity-50 cursor-default"
          title="Scroll to zoom"
        >
          <ZoomOut size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Pan/zoom container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        data-pannable="true"
      >
        <div
          style={style}
          className="relative"
          data-pannable="true"
        >
          {/* Map surface */}
          <div
            className="relative rounded-2xl border border-gray-200 dark:border-slate-700 shadow-inner"
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
            data-pannable="true"
          >
            {/* Grid pattern background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Topic zones */}
            {ZONES.map((zone) => (
              <TopicZone
                key={zone.id}
                zone={zone}
                placements={placements}
                myUserId={userId}
                isSelected={selectedZoneId === zone.id}
                onSelect={handleSelectZone}
              />
            ))}

            {/* Map title watermark */}
            <div className="absolute bottom-4 left-6 pointer-events-none select-none">
              <p className="text-lg font-bold text-gray-200 dark:text-slate-700">
                Scotia Convene &mdash; Chat Zones
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedZone && (
        <ZoneDetailPanel
          zone={selectedZone}
          placements={placements}
          myPlacement={myPlacement}
          userId={userId}
          userName={userName}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
