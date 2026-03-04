"use client";

import { useMemo } from "react";
import { ATTENDEES } from "@/data/attendees";
import { SPEAKERS } from "@/data/speakers";
import { AttendeeCard } from "./AttendeeCard";

interface AttendeeGridProps {
  search: string;
}

export function AttendeeGrid({ search }: AttendeeGridProps) {
  const speakerNames = useMemo(
    () => new Set(SPEAKERS.map((s) => s.name)),
    []
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return ATTENDEES;
    const q = search.toLowerCase();
    return ATTENDEES.filter((a) => a.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((attendee) => (
        <AttendeeCard
          key={attendee.id}
          attendee={attendee}
          isSpeaker={speakerNames.has(attendee.name)}
        />
      ))}
      {filtered.length === 0 && (
        <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
          No attendees found matching &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}
