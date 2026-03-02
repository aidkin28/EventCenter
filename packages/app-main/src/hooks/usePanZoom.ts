"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface PanZoomState {
  x: number;
  y: number;
  scale: number;
}

interface UsePanZoomReturn {
  state: PanZoomState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  resetView: () => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.0;

/** Hook for pan (drag) and zoom (wheel/pinch) on a container */
export function usePanZoom(): UsePanZoomReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<PanZoomState>({ x: 0, y: 0, scale: 0.85 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setState((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * delta)),
    }));
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only drag on middle-click or if target is the background
    if (e.button === 1 || (e.target as HTMLElement).dataset.pannable === "true") {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setState((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  const style: React.CSSProperties = {
    transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    transformOrigin: "center center",
    transition: isDragging.current ? "none" : "transform 0.1s ease-out",
  };

  const resetView = useCallback(() => {
    setState({ x: 0, y: 0, scale: 0.85 });
  }, []);

  return { state, containerRef, style, resetView };
}
