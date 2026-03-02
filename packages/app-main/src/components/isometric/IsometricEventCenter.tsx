"use client";

import React, { useMemo } from "react";
import { useIsometricGrid } from "./useIsometricGrid";
import { useCharacterSimulation } from "./useCharacterSimulation";
import { gridToIso, BOOTH_CONFIGS } from "./isometricUtils";
import IsometricTile from "./IsometricTile";
import IsometricCharacter from "./IsometricCharacter";
import IsometricStage from "./IsometricStage";
import IsometricBooth from "./IsometricBooth";
import IsometricRegistration from "./IsometricRegistration";

interface IsometricEventCenterProps {
  /** Show stage and tables. Off by default. */
  showStage?: boolean;
  /** Show exhibition booths. Off by default. */
  showBooths?: boolean;
  /** Show registration booth. Off by default. */
  showRegistration?: boolean;
  /** Banner text displayed above the stage */
  bannerText?: string;
  /** Enable character proximity interactions (greeting, chatting). On by default. */
  enableInteractions?: boolean;
}

/** Full-screen animated isometric event center background */
export default function IsometricEventCenter({
  showStage = false,
  showBooths = false,
  showRegistration = false,
  bannerText = "Convene",
  enableInteractions = true,
}: IsometricEventCenterProps) {
  const grid = useIsometricGrid();
  const characters = useCharacterSimulation(grid, showStage, enableInteractions);

  // Memoize static elements (floor tiles + optional stage/booths)
  const staticElements = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    const halfC = Math.floor(grid.cols / 2);
    const halfR = Math.floor(grid.rows / 2);

    for (let gx = -halfC; gx <= halfC; gx++) {
      for (let gy = -halfR; gy <= halfR; gy++) {
        const iso = gridToIso(gx, gy);
        tiles.push(
          <IsometricTile
            key={`${gx},${gy}`}
            isoX={iso.x}
            isoY={iso.y}
            dark={(gx + gy) % 2 === 0}
          />
        );
      }
    }

    // Stage positioned at 3/4 right, 3/4 top of the viewable area
    const stageOffsetX = grid.originX * 0.5;
    const stageOffsetY = -grid.originY * 0.5;

    // Registration booth positioned top-left
    const regOffsetX = -grid.originX * 0.5;
    const regOffsetY = -grid.originY * 0.45;

    return (
      <>
        <g>{tiles}</g>

        {showBooths && BOOTH_CONFIGS.map((booth) => (
          <IsometricBooth key={booth.id} booth={booth} />
        ))}

        {showRegistration && (
          <IsometricRegistration
            offsetX={regOffsetX}
            offsetY={regOffsetY}
          />
        )}

        {showStage && (
          <IsometricStage
            bannerText={bannerText}
            offsetX={stageOffsetX}
            offsetY={stageOffsetY}
          />
        )}
      </>
    );
  }, [grid.cols, grid.rows, grid.originX, grid.originY, showStage, showBooths, showRegistration, bannerText]);

  // Sort characters by depth (higher x+y = drawn later = in front)
  // No useMemo — characters are mutated in place, sort is trivial for ~40 items
  const sortedCharacters = [...characters].sort((a, b) => (a.x + a.y) - (b.x + b.y));

  // Stage visual center in SVG coords (matches the translate offset used for IsometricStage)
  const stageCenterX = grid.originX * 0.5;
  const stageCenterY = -grid.originY * 0.5;
  const STAGE_BUBBLE_RADIUS_SQ = 350 * 350; // 350px radius around stage center

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`${-grid.originX} ${-grid.originY} ${grid.originX * 2} ${grid.originY * 2}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ background: "#f0e8e0" }}
    >
      {staticElements}

      {sortedCharacters.map((char) => {
        const charIso = gridToIso(char.x, char.y);
        const dx = charIso.x - stageCenterX;
        const dy = charIso.y - stageCenterY;
        const nearStage = showStage && (dx * dx + dy * dy) < STAGE_BUBBLE_RADIUS_SQ;
        return (
          <IsometricCharacter key={char.id} character={char} showAIBubble={nearStage} />
        );
      })}
    </svg>
  );
}
