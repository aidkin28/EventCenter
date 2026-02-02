"use client";

import React from "react";
import { cn } from "@common/lib/utils";

interface RotatingBorderProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  rotationSpeed?: number;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  contentBackground?: string;
  /** Controls how much of the gradient each color occupies (0-1). Lower = wider gaps, higher = wider color bands. Default 0.5 */
  colorSpread?: number;
  /** Color of the gaps between color bands. Default is transparent (shows background). Use hex like "#1a1a1a" */
  gapColor?: string;
}

interface ShineBorderProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: number;
  borderWidth?: number;
  padding?: number;
  duration?: number;
  color?: string | string[];
}

export function RotatingBorder({
  children,
  className,
  colors = ["#4a4a4a", "#6a6a6a", "#3a3a3a"],
  rotationSpeed = 0.25,
  borderWidth = 2,
  borderRadius = 8,
  padding = 0,
  contentBackground,
  colorSpread = 0.5,
  gapColor,
}: RotatingBorderProps) {
  const duration = rotationSpeed > 0 ? 1 / rotationSpeed : 0;

  // Build gradient with smooth transitions - each segment covers its full range
  const totalColors = colors.length;
  const segmentSize = 100 / totalColors;
  const spread = Math.max(0, Math.min(1, colorSpread));

  // Each segment covers full segmentSize: gap -> color (at center) -> gap
  // spread controls how much of the segment is colored vs gap
  const peakWidth = segmentSize * spread * 0.5; // Half-width of the colored area

  const gradientStops = colors.flatMap((color, i) => {
    const segmentStart = i * segmentSize;
    const segmentCenter = segmentStart + segmentSize / 2;
    const segmentEnd = segmentStart + segmentSize;

    const peakStart = segmentCenter - peakWidth;
    const peakEnd = segmentCenter + peakWidth;

    // Use gapColor if provided, otherwise use transparent
    const gapStop = gapColor || "transparent";

    return [
      `${gapStop} ${segmentStart.toFixed(2)}%`,
      `${color} ${peakStart.toFixed(2)}%`,
      `${color} ${peakEnd.toFixed(2)}%`,
      `${gapStop} ${segmentEnd.toFixed(2)}%`,
    ];
  }).join(", ");

  return (
    <div
      className={cn("relative flex", className)}
      style={{
        borderRadius: `${borderRadius}px`,
        background: `linear-gradient(var(--gradient-angle), ${gradientStops})`,
        animation: duration > 0
          ? `gradient-rotate ${duration}s linear infinite`
          : undefined,
        padding: `${borderWidth}px`,
      }}
    >
      <div
        className={cn("relative flex-1", contentBackground || "bg-background")}
        style={{
          borderRadius: `${borderRadius - borderWidth}px`,
          padding: padding > 0 ? `${padding}px` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ShineBorder({
  children,
  className,
  borderRadius = 8,
  borderWidth = 2,
  padding = 0,
  duration = 14,
  color = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
}: ShineBorderProps) {
  const gradientColors = Array.isArray(color) ? color.join(", ") : color;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        borderRadius: `${borderRadius}px`,
        padding: `${borderWidth}px`,
        background: `linear-gradient(90deg, ${gradientColors})`,
        backgroundSize: "400% 100%",
        animation: `shine ${duration}s ease infinite`,
      }}
    >
      <div
        className="relative h-full w-full bg-background"
        style={{
          borderRadius: `${borderRadius - borderWidth}px`,
          padding: padding > 0 ? `${padding}px` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
