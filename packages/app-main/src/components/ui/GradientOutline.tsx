"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface GradientOutlineProps {
  children: ReactNode;
  className?: string;
  borderRadius?: string;
  outlineWidth?: number;
  animate?: boolean;
  animationDuration?: number;
}

export function GradientOutline({
  children,
  className,
  borderRadius,
  outlineWidth = 1.5,
  animate = false,
  animationDuration = 8,
}: GradientOutlineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [computedRadius, setComputedRadius] = useState("6px");

  useEffect(() => {
    if (borderRadius) {
      setComputedRadius(borderRadius);
      return;
    }
    // Auto-detect from first child element
    const firstChild = containerRef.current?.firstElementChild;
    if (firstChild) {
      const styles = getComputedStyle(firstChild);
      setComputedRadius(styles.borderRadius || "6px");
    }
  }, [borderRadius, children]);

  const outerRadius = `calc(${computedRadius} + ${outlineWidth}px)`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Inject keyframes via style tag */}
      {animate && (
        <style>{`
          @keyframes gradient-shine-oscillate {
            0%, 100% { transform: rotate(170deg); }
            50% { transform: rotate(250deg); }
          }
        `}</style>
      )}
      {/* Mask container - static, clips the rotating gradient */}
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{
          inset: `-${outlineWidth}px`,
          borderRadius: outerRadius,
          padding: `${outlineWidth}px`,
          WebkitMask: `
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0)
          `,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      >
        {/* Oscillating gradient layer */}
        <div
          style={{
            position: "absolute",
            inset: "-50%",
            width: "200%",
            height: "200%",
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              rgba(140, 140, 155, 0.15) 20deg,
              rgba(150, 150, 165, 0.25) 45deg,
              rgba(160, 160, 175, 0.35) 70deg,
              rgba(170, 170, 185, 0.45) 95deg,
              rgba(180, 180, 195, 0.55) 120deg,
              rgba(190, 190, 205, 0.6) 145deg,
              rgba(200, 200, 215, 0.65) 170deg,
              rgba(190, 190, 205, 0.6) 195deg,
              rgba(180, 180, 195, 0.55) 220deg,
              rgba(170, 170, 185, 0.45) 245deg,
              rgba(160, 160, 175, 0.35) 270deg,
              rgba(150, 150, 165, 0.25) 295deg,
              rgba(140, 140, 155, 0.15) 320deg,
              transparent 340deg,
              transparent 360deg
            )`,
            animation: animate
              ? `gradient-shine-oscillate ${animationDuration}s ease-in-out infinite`
              : undefined,
          }}
        />
      </div>
      {children}
    </div>
  );
}
