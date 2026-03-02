import React from "react";
import type { BoothConfig } from "./types";
import { gridToIso, TILE_W, TILE_H } from "./isometricUtils";

interface IsometricBoothProps {
  booth: BoothConfig;
}

/** Exhibition booth: isometric 3D box with back wall, side wall, counter, and label */
const IsometricBooth: React.FC<IsometricBoothProps> = ({ booth }) => {
  const { label, gridX, gridY, color, accentColor } = booth;

  // Booth footprint corners (2x2 tiles)
  const tl = gridToIso(gridX, gridY);
  const tr = gridToIso(gridX + 2, gridY);
  const br = gridToIso(gridX + 2, gridY + 2);
  const bl = gridToIso(gridX, gridY + 2);

  const wallH = 24;
  const counterH = 8;

  // Back wall (top edge of booth)
  const backWall = [
    `${tl.x},${tl.y - wallH}`,
    `${tr.x},${tr.y - wallH}`,
    `${tr.x},${tr.y}`,
    `${tl.x},${tl.y}`,
  ].join(" ");

  // Side wall (right edge)
  const sideWall = [
    `${tr.x},${tr.y - wallH}`,
    `${br.x},${br.y - wallH * 0.3}`,
    `${br.x},${br.y}`,
    `${tr.x},${tr.y}`,
  ].join(" ");

  // Counter surface (top face of a low box)
  const counterTop = [
    `${tl.x},${tl.y - counterH}`,
    `${tr.x},${tr.y - counterH}`,
    `${br.x},${br.y - counterH}`,
    `${bl.x},${bl.y - counterH}`,
  ].join(" ");

  // Counter front face
  const counterFront = [
    `${tl.x},${tl.y - counterH}`,
    `${bl.x},${bl.y - counterH}`,
    `${bl.x},${bl.y}`,
    `${tl.x},${tl.y}`,
  ].join(" ");

  // Counter side face
  const counterSide = [
    `${bl.x},${bl.y - counterH}`,
    `${br.x},${br.y - counterH}`,
    `${br.x},${br.y}`,
    `${bl.x},${bl.y}`,
  ].join(" ");

  // Label position (center of booth, above counter)
  const center = gridToIso(gridX + 1, gridY + 1);

  return (
    <g>
      {/* Counter */}
      <polygon points={counterTop} fill={color} opacity={0.6} />
      <polygon points={counterFront} fill={accentColor} opacity={0.5} />
      <polygon points={counterSide} fill={accentColor} opacity={0.4} />

      {/* Back wall */}
      <polygon points={backWall} fill={color} opacity={0.35} />

      {/* Side wall */}
      <polygon points={sideWall} fill={accentColor} opacity={0.25} />

      {/* Accent stripe on back wall */}
      <line
        x1={tl.x} y1={tl.y - wallH + 4}
        x2={tr.x} y2={tr.y - wallH + 4}
        stroke={color} strokeWidth={2} opacity={0.8}
      />

      {/* Label */}
      <text
        x={center.x} y={center.y - counterH - 4}
        textAnchor="middle"
        fontSize={7}
        fontWeight="600"
        fontFamily="Arial, sans-serif"
        fill="#333"
      >
        {label}
      </text>
    </g>
  );
};

export default React.memo(IsometricBooth);
