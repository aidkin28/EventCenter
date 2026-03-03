"use client";

import { useState, useRef, useEffect } from "react";

interface MindMapNodeInputProps {
  onSubmit: (label: string) => void;
  onCancel: () => void;
  initialValue?: string;
}

const MAX_WORDS = 12;

export function MindMapNodeInput({
  onSubmit,
  onCancel,
  initialValue = "",
}: MindMapNodeInputProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
      }
    } else if (e.key === "Escape") {
      onCancel();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= MAX_WORDS) {
      setValue(text);
    }
  }

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-white px-3 py-2 shadow-sm">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="Node label (Enter to add, Esc to cancel)"
        maxLength={200}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {wordCount}/{MAX_WORDS}
      </span>
    </div>
  );
}
