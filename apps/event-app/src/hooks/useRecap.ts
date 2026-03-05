"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { DayRecapData } from "@/data/recap-types";

interface RecapResponse {
  status: "not_started" | "loading" | "ready";
  recap?: DayRecapData;
}

async function fetchRecap(
  eventId: string,
  date: string
): Promise<RecapResponse> {
  const res = await fetch(
    `/api/events/${eventId}/recap?date=${encodeURIComponent(date)}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useRecap(
  eventId: string | null | undefined,
  date: string | null | undefined
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["recap", eventId, date],
    queryFn: () => fetchRecap(eventId!, date!),
    enabled: !!eventId && !!date,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 3s while loading
      if (data?.status === "loading") return 3000;
      return false;
    },
  });

  const triggerGeneration = useCallback(async () => {
    if (!eventId || !date) return;
    try {
      await fetch(`/api/events/${eventId}/recap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      // Start polling
      queryClient.invalidateQueries({ queryKey: ["recap", eventId, date] });
    } catch (err) {
      console.error("[useRecap] trigger failed:", err);
    }
  }, [eventId, date, queryClient]);

  return {
    recap: query.data?.status === "ready" ? query.data.recap : undefined,
    isLoading: query.data?.status === "loading",
    isNotStarted: query.data?.status === "not_started" || !query.data,
    isReady: query.data?.status === "ready",
    triggerGeneration,
  };
}
