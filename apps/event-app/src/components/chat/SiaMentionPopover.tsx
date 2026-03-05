"use client";

import type { SiaMentionOption } from "@/hooks/useSiaMention";

interface SiaMentionPopoverProps {
  options: SiaMentionOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SiaMentionPopover({
  options,
  selectedIndex,
  onSelect,
}: SiaMentionPopoverProps) {
  if (options.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-50">
      <div className="rounded-lg border bg-background shadow-md overflow-hidden">
        {options.map((option, i) => (
          <button
            key={option.label}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent input blur
              onSelect(i);
            }}
            className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
              i === selectedIndex
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            }`}
          >
            <span className="font-medium whitespace-nowrap">
              @{option.label}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
