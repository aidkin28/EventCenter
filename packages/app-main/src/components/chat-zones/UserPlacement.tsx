"use client";

import React from "react";
import type { UserPlacementData } from "./chatZonesUtils";

interface UserPlacementProps {
  placement: UserPlacementData;
  isMe: boolean;
}

/** Small avatar circle placed within a zone */
const UserPlacement: React.FC<UserPlacementProps> = ({ placement, isMe }) => {
  const initial = placement.userName.charAt(0).toUpperCase();

  return (
    <div
      className="absolute group"
      style={{
        left: `${placement.offsetX * 100}%`,
        top: `${placement.offsetY * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform hover:scale-125 ${
          isMe ? "ring-2 ring-offset-1 ring-primary" : ""
        }`}
        style={{ backgroundColor: isMe ? "#ec121f" : "#6366f1" }}
        title={`${placement.userName}${placement.note ? `: ${placement.note}` : ""}`}
      >
        {initial}
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap max-w-[200px] truncate shadow-lg">
          <p className="font-semibold">{placement.userName}</p>
          {placement.note && <p className="text-gray-300 truncate">{placement.note}</p>}
        </div>
      </div>
    </div>
  );
};

export default React.memo(UserPlacement);
