import React from "react";
import { TILE_W, TILE_H } from "./isometricUtils";

interface IsometricTileProps {
  isoX: number;
  isoY: number;
  dark: boolean;
}

/** Single isometric floor tile rendered as a diamond polygon */
const IsometricTile: React.FC<IsometricTileProps> = ({ isoX, isoY, dark }) => {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const points = `${isoX},${isoY - hh} ${isoX + hw},${isoY} ${isoX},${isoY + hh} ${isoX - hw},${isoY}`;

  return (
    <polygon
      points={points}
      fill={dark ? "#d4ccc4" : "#e8e0d8"}
      stroke="#c8c0b8"
      strokeWidth={0.5}
    />
  );
};

export default React.memo(IsometricTile);
