"use client";

import { useState, useEffect } from "react";
import type { GridConfig } from "./types";
import { TILE_W, TILE_H } from "./isometricUtils";

/** Hook that calculates grid dimensions to cover the viewport with isometric tiles */
export function useIsometricGrid(): GridConfig {
  const [config, setConfig] = useState<GridConfig>({
    cols: 50,
    rows: 50,
    tileWidth: TILE_W,
    tileHeight: TILE_H,
    originX: 960,
    originY: 540,
    characterCount: 40,
  });

  useEffect(() => {
    function calculate() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Isometric projection rotates the grid 45deg so diagonal coverage
      // needs substantially more tiles than flat. +30 overflow per dimension
      // guarantees no white space at any viewport size.
      const cols = Math.ceil(w / TILE_W) + 30;
      const rows = Math.ceil(h / TILE_H) + 30;

      // Character density: ~1 per 200x200 px area
      const area = w * h;
      const characterCount = Math.max(15, Math.floor(area / (200 * 200)));

      setConfig({
        cols,
        rows,
        tileWidth: TILE_W,
        tileHeight: TILE_H,
        originX: w / 2,
        originY: h / 2,
        characterCount,
      });
    }

    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  return config;
}
