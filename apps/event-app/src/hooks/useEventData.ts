"use client";

import { useState, useEffect } from "react";
import type { Session, Speaker, Attendee } from "@/data/types";

interface FetchState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

function useApiFetch<T>(url: string | null, initial: T): FetchState<T> {
  const [data, setData] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setData(initial);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, error };
}

export function useEventSessions(eventId: string | null | undefined) {
  return useApiFetch<Session[]>(
    eventId ? `/api/events/${eventId}/sessions` : null,
    []
  );
}

export function useEventSpeakers(eventId: string | null | undefined) {
  return useApiFetch<Speaker[]>(
    eventId ? `/api/events/${eventId}/speakers` : null,
    []
  );
}

export function useEventAttendees(eventId: string | null | undefined) {
  return useApiFetch<Attendee[]>(
    eventId ? `/api/events/${eventId}/attendees` : null,
    []
  );
}
