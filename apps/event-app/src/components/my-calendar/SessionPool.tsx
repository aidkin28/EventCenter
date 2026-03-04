"use client";

import { useMemo } from "react";
import { useCalendarStore } from "@/lib/stores/calendarStore";
import { DraggableSession } from "./DraggableSession";
import type { Session } from "@/data/types";

interface SessionPoolProps {
  sessions: Session[];
  dateFilter: string;
}

export function SessionPool({ sessions, dateFilter }: SessionPoolProps) {
  const selectedIds = useCalendarStore((s) => s.selectedSessionIds);
  const addSession = useCalendarStore((s) => s.addSession);

  const daySessions = useMemo(
    () => sessions.filter((s) => s.date === dateFilter),
    [sessions, dateFilter]
  );

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Available Sessions
      </h3>
      <div className="space-y-2">
        {daySessions.map((session) => (
          <DraggableSession
            key={session.id}
            session={session}
            isSelected={selectedIds.includes(session.id)}
            onAdd={() => addSession(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
