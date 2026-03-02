"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Character, GridConfig } from "./types";
import { createCharacter, stepCharacter, processInteractions } from "./isometricUtils";

/**
 * Hook that manages character creation and continuous rAF movement loop.
 * Uses useRef for character data to avoid GC pressure from creating new
 * objects every frame. A frame counter state triggers React re-renders.
 */
export function useCharacterSimulation(
  grid: GridConfig,
  avoidStage: boolean,
  enableInteractions = false,
): Character[] {
  const charsRef = useRef<Character[]>([]);
  const [, setFrameKey] = useState(0);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const initialized = useRef(false);

  // Stable refs for values used inside the rAF loop
  const avoidStageRef = useRef(avoidStage);
  avoidStageRef.current = avoidStage;
  const enableInteractionsRef = useRef(enableInteractions);
  enableInteractionsRef.current = enableInteractions;

  // Initialize characters once
  const initChars = useCallback(() => {
    if (grid.characterCount <= 0 || initialized.current) return;
    initialized.current = true;

    const chars: Character[] = [];
    for (let i = 0; i < grid.characterCount; i++) {
      chars.push(createCharacter(i, grid.cols, grid.rows, avoidStage));
    }
    charsRef.current = chars;
    setFrameKey(1); // trigger initial render
  }, [grid.characterCount, grid.cols, grid.rows, avoidStage]);

  useEffect(() => {
    initChars();
  }, [initChars]);

  // Continuous animation loop via requestAnimationFrame
  useEffect(() => {
    function tick(timestamp: number) {
      // Compute delta time
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(timestamp - lastTimeRef.current, 50); // cap at 50ms to avoid jumps
      lastTimeRef.current = timestamp;

      const chars = charsRef.current;
      const avoid = avoidStageRef.current;

      // Step each character in place
      for (let i = 0; i < chars.length; i++) {
        stepCharacter(chars[i], avoid, dt);
      }

      // Process interactions if enabled
      if (enableInteractionsRef.current) {
        processInteractions(chars);
      }

      // Trigger React re-render
      setFrameKey((k) => k + 1);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // no deps — uses refs for mutable values

  return charsRef.current;
}
