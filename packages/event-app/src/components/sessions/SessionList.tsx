"use client";

import { useMemo } from "react";
import { SESSIONS } from "@/data/sessions";
import { SPEAKERS } from "@/data/speakers";
import { useSessionStore } from "@/lib/stores/sessionStore";
import { SessionCard } from "./SessionCard";

export function SessionList() {
  const userSessions = useSessionStore((s) => s.userSessions);
  const upvotes = useSessionStore((s) => s.upvotes);

  const speakerMap = useMemo(
    () => new Map(SPEAKERS.map((s) => [s.id, s])),
    []
  );

  const allSessions = useMemo(() => {
    const combined = [...SESSIONS, ...userSessions];
    return combined.sort(
      (a, b) => (upvotes[b.id] ?? 0) - (upvotes[a.id] ?? 0)
    );
  }, [userSessions, upvotes]);

  return (
    <div className="space-y-3">
      {allSessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          speaker={speakerMap.get(session.speakerId)}
        />
      ))}
    </div>
  );
}
