"use client";

import React from "react";
import type { ZoneConfig, UserPlacementData } from "./chatZonesUtils";
import UserPlacement from "./UserPlacement";

interface TopicZoneProps {
  zone: ZoneConfig;
  placements: UserPlacementData[];
  myUserId: string | null;
  isSelected: boolean;
  onSelect: (zoneId: string) => void;
}

/** Clickable zone card on the map with participant avatars */
const TopicZone: React.FC<TopicZoneProps> = ({
  zone,
  placements,
  myUserId,
  isSelected,
  onSelect,
}) => {
  const zonePlacements = placements.filter((p) => p.zoneId === zone.id);

  return (
    <div
      className={`absolute rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? "shadow-xl" : "hover:scale-[1.01]"
      }`}
      style={{
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height,
        backgroundColor: zone.bgColor,
        borderColor: isSelected ? zone.color : zone.borderColor,
        outlineColor: isSelected ? zone.color : undefined,
        outlineWidth: isSelected ? 2 : 0,
        outlineOffset: 2,
        outlineStyle: isSelected ? "solid" : undefined,
      }}
      onClick={() => onSelect(zone.id)}
    >
      {/* Zone header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3
            className="text-sm font-bold"
            style={{ color: zone.color }}
          >
            {zone.name}
          </h3>
          {zonePlacements.length > 0 && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: zone.color, color: "white" }}
            >
              {zonePlacements.length}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {zone.description}
        </p>
      </div>

      {/* User placement avatars */}
      <div className="relative w-full" style={{ height: zone.height - 70 }}>
        {zonePlacements.map((p) => (
          <UserPlacement
            key={p.id}
            placement={p}
            isMe={p.userId === myUserId}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(TopicZone);
