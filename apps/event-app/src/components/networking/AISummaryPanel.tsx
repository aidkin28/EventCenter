"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useNetworkingStore } from "@/lib/stores/networkingStore";

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
  const groups = useNetworkingStore((s) => s.groups);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  const insights =
    groups.find((g) => g.id === selectedGroupId)?.insights ?? [];

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

      {/* Insight labels */}
      <div className="flex flex-wrap gap-1.5 min-h-[80px]">
        {insights.length > 0 ? (
          insights.map((insight) => (
            <span
              key={insight}
              className="inline-flex rounded-full bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-primary"
            >
              {insight}
            </span>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            Insights will appear as the conversation grows.
          </p>
        )}
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
