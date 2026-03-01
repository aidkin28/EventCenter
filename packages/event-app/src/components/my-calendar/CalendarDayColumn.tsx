"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@common/lib/utils";
import { X } from "lucide-react";
import type { Session, Speaker } from "@/data/types";
import { formatTimeRange } from "@/lib/time";

interface CalendarDayColumnProps {
  day: 1 | 2 | 3;
  sessions: Session[];
  speakers: Speaker[];
  onRemoveSession: (sessionId: string) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am-6pm

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function DroppableSlot({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute inset-0 transition-colors",
        isOver && "bg-primary/[0.06]"
      )}
    />
  );
}

export function CalendarDayColumn({
  day,
  sessions,
  speakers,
  onRemoveSession,
}: CalendarDayColumnProps) {
  const speakerMap = useMemo(
    () => new Map(speakers.map((s) => [s.id, s])),
    [speakers]
  );

  const startMinutes = 8 * 60;
  const totalMinutes = 10 * 60;

  return (
    <div className="relative rounded-xl border border-border bg-white">
      <div className="relative" style={{ height: `${totalMinutes}px` }}>
        {/* Drop zone for the entire day */}
        <DroppableSlot id={`day-${day}`} />

        {/* Hour grid lines */}
        {HOURS.map((hour) => {
          const top = (hour - 8) * 60;
          return (
            <div
              key={hour}
              className="pointer-events-none absolute left-0 right-0"
              style={{ top }}
            >
              <div className="flex items-start">
                <span className="w-14 flex-shrink-0 pr-2 text-right text-[11px] text-muted-foreground -translate-y-1.5">
                  {hour === 12
                    ? "12 PM"
                    : hour > 12
                      ? `${hour - 12} PM`
                      : `${hour} AM`}
                </span>
                <div className="flex-1 border-t border-dashed border-border/40" />
              </div>
            </div>
          );
        })}

        {/* Session blocks */}
        {sessions.map((session) => {
          const sessionStart = timeToMinutes(session.startTime) - startMinutes;
          const sessionDuration =
            timeToMinutes(session.endTime) - timeToMinutes(session.startTime);
          const speaker = speakerMap.get(session.speakerId);

          return (
            <div
              key={session.id}
              className="absolute left-14 right-3 z-10"
              style={{
                top: `${sessionStart + 2}px`,
                height: `${sessionDuration - 4}px`,
              }}
            >
              <div className="group flex h-full items-start rounded-lg border border-primary/20 bg-primary/[0.04] p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {session.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatTimeRange(session.startTime, session.endTime)}
                    {speaker && ` · ${speaker.name}`}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveSession(session.id)}
                  className="flex-shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50">
              Drag sessions here or click + to add
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
