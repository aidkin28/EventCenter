"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useNetworkingStore } from "@/lib/stores/networkingStore";
import { WordCloud } from "./WordCloud";

interface SummaryData {
  summary: string;
  topWords: string[];
  recentExcerpts: { author: string; preview: string }[];
  messageCount: number;
}

export function AISummaryPanel() {
  const selectedGroupId = useNetworkingStore((s) => s.selectedGroupId);
  const isMember = useNetworkingStore((s) => s.isMember);
  const messages = useNetworkingStore((s) => s.messages);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  // Fetch summary when messages change significantly
  useEffect(() => {
    if (!selectedGroupId || !isMember) return;

    fetch(`/api/networking/groups/${selectedGroupId}/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummaryData(data);
      })
      .catch(() => {});
  }, [selectedGroupId, isMember, messages.length]);

  if (!isMember) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Join the group to see insights
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Insights</h4>
      </div>

      {/* Word Cloud */}
      <div className="flex-1 flex items-center justify-center min-h-[80px]">
        <WordCloud />
      </div>

      {/* AI Summary text */}
      {summaryData && (
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-xs text-foreground/70">{summaryData.summary}</p>
        </div>
      )}
    </div>
  );
}
