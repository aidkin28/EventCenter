"use client";

import { useMemo } from "react";
import { useNetworkingStore } from "@/lib/stores/networkingStore";

// Stop words to exclude
const STOP_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get",
  "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "into", "year", "your", "some",
  "could", "them", "see", "other", "than", "then", "now", "look",
  "only", "come", "its", "over", "think", "also", "back", "after",
  "use", "how", "our", "was", "were", "been", "has", "had", "is",
  "are", "am", "im", "dont", "very", "much", "more",
]);

interface WordEntry {
  word: string;
  count: number;
  size: number;
}

export function WordCloud() {
  const messages = useNetworkingStore((s) => s.messages);

  const words = useMemo<WordEntry[]>(() => {
    const freq: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.isAiSummary) continue;
      const tokens = msg.content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

      for (const token of tokens) {
        freq[token] = (freq[token] || 0) + 1;
      }
    }

    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    if (sorted.length === 0) return [];

    const maxCount = sorted[0][1];
    const minCount = sorted[sorted.length - 1][1];
    const range = maxCount - minCount || 1;

    return sorted.map(([word, count]) => ({
      word,
      count,
      // Font size between 12px and 28px
      size: 12 + ((count - minCount) / range) * 16,
    }));
  }, [messages]);

  if (words.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Word cloud will appear as the conversation grows.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {words.map((entry) => (
        <span
          key={entry.word}
          className="inline-block text-primary/80 font-medium transition-all duration-300"
          style={{ fontSize: `${entry.size}px` }}
          title={`${entry.word}: ${entry.count}`}
        >
          {entry.word}
        </span>
      ))}
    </div>
  );
}
