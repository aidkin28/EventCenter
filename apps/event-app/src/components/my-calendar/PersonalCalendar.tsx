"use client";

import { useMemo } from "react";
import { useCalendarStore } from "@/lib/stores/calendarStore";
import { CalendarDayColumn } from "./CalendarDayColumn";
import type { Session } from "@/data/types";

interface PersonalCalendarProps {
  sessions: Session[];
  dateFilter: string;
}

export function PersonalCalendar({ sessions, dateFilter }: PersonalCalendarProps) {
  const selectedIds = useCalendarStore((s) => s.selectedSessionIds);
  const removeSession = useCalendarStore((s) => s.removeSession);

  const selectedSessions = useMemo(
    () =>
      sessions.filter((s) => s.date === dateFilter && selectedIds.includes(s.id)),
    [sessions, dateFilter, selectedIds]
  );

  return (
    <CalendarDayColumn
      sessions={selectedSessions}
      onRemoveSession={removeSession}
    />
  );
}
