import { useState, useCallback, useEffect } from "react";

export interface SiaMentionOption {
  label: string;
  description: string;
  insertText: string;
}

const ALL_OPTIONS: SiaMentionOption[] = [
  {
    label: "sia",
    description: "AI research assistant",
    insertText: "@sia ",
  },
  {
    label: "sia research [topic]",
    description: "Search the web for information",
    insertText: "@sia research ",
  },
  {
    label: "sia add message to [group]",
    description: "Post a message to another group",
    insertText: "@sia add message to ",
  },
  {
    label: "sia create networking group [topic]",
    description: "Create a new networking group",
    insertText: "@sia create networking group ",
  },
];

/** Simple fuzzy match — checks if all characters of the query appear in order within the target */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let prevMatchIdx = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Consecutive matches score higher
      score += (ti === prevMatchIdx + 1) ? 2 : 1;
      prevMatchIdx = ti;
      qi++;
    }
  }

  // All query chars must be found
  return qi === q.length ? score : -1;
}

export function useSiaMention(input: string, inputEl: HTMLInputElement | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState<SiaMentionOption[]>([]);

  // Detect @ trigger and fuzzy filter all options
  useEffect(() => {
    // Match everything from @ to end of input (@ must be at start or after whitespace)
    const match = input.match(/(?:^|\s)(@.*)$/);
    if (!match) {
      setIsOpen(false);
      setFilteredOptions([]);
      return;
    }

    // Strip the leading @ for fuzzy matching against labels (which don't have @)
    const typed = match[1].slice(1).toLowerCase();

    // Score and filter all options
    const scored = ALL_OPTIONS
      .map((opt) => ({ opt, score: fuzzyMatch(typed, opt.label) }))
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      setIsOpen(true);
      setFilteredOptions(scored.map((s) => s.opt));
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
      setFilteredOptions([]);
    }
  }, [input]);

  const selectOption = useCallback(
    (index: number) => {
      const option = filteredOptions[index];
      if (!option || !inputEl) return;

      // Replace the @... portion with the insert text
      const match = input.match(/(?:^|\s)(@.*)$/);
      if (!match) return input + option.insertText;

      const before = input.slice(0, input.length - match[0].length);
      const prefix = before.length > 0 ? " " : "";
      return before + prefix + option.insertText;
    },
    [filteredOptions, input, inputEl]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || filteredOptions.length === 0) return false;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filteredOptions.length);
          return true;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) =>
            i <= 0 ? filteredOptions.length - 1 : i - 1
          );
          return true;
        case "Enter":
        case "Tab":
          e.preventDefault();
          return selectOption(selectedIndex) ?? false;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setFilteredOptions([]);
          return true;
        default:
          return false;
      }
    },
    [isOpen, filteredOptions, selectedIndex, selectOption]
  );

  return {
    isOpen: isOpen && filteredOptions.length > 0,
    options: filteredOptions,
    selectedIndex,
    selectOption,
    handleKeyDown,
  };
}
