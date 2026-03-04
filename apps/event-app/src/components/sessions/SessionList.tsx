"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@common/components/ui/Tabs";
import { cn } from "@common/lib/utils";
import { SESSIONS } from "@/data/sessions";
import { SPEAKERS } from "@/data/speakers";
import { EVENT_INFO } from "@/data/event";
import { useSessionStore } from "@/lib/stores/sessionStore";
import { SessionCard } from "./SessionCard";

function formatDayLabel(dateStr: string, dayNum: number) {
  const date = new Date(dateStr + "T12:00:00");
  return `Day ${dayNum} · ${format(date, "EEEE, MMM d")}`;
}

function ScrollReveal({ children, delay }: { children: React.ReactNode; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

export function SessionList() {
  const [activeDay, setActiveDay] = useState<string>("day-1");

  const userSessions = useSessionStore((s) => s.userSessions);
  const upvotes = useSessionStore((s) => s.upvotes);

  const speakerMap = useMemo(
    () => new Map(SPEAKERS.map((s) => [s.id, s])),
    []
  );

  const sessionsByDay = useMemo(() => {
    const combined = [...SESSIONS, ...userSessions];
    const grouped: Record<number, typeof combined> = { 1: [], 2: [], 3: [] };
    for (const session of combined) {
      (grouped[session.day] ??= []).push(session);
    }
    for (const day of [1, 2, 3]) {
      grouped[day].sort((a, b) => (upvotes[b.id] ?? 0) - (upvotes[a.id] ?? 0));
    }
    return grouped;
  }, [userSessions, upvotes]);

  const days = [
    { value: "day-1", date: EVENT_INFO.dates.day1, num: 1 },
    { value: "day-2", date: EVENT_INFO.dates.day2, num: 2 },
    { value: "day-3", date: EVENT_INFO.dates.day3, num: 3 },
  ] as const;

  return (
    <Tabs defaultValue="day-1" onValueChange={setActiveDay}>
      <TabsList className="mb-6 flex items-start gap-2 bg-transparent p-0">
        {days.map((day) => (
          <div
            key={day.value}
            className={cn(
              "rounded-xl px-1 py-1 transition-colors",
              activeDay === day.value
                ? "bg-primary/15"
                : "bg-primary/[0.06]"
            )}
          >
            <TabsTrigger value={day.value}>
              {formatDayLabel(day.date, day.num)}
            </TabsTrigger>
          </div>
        ))}
      </TabsList>

      {([1, 2, 3] as const).map((day) => (
        <TabsContent key={day} value={`day-${day}`} variant="blank">
          <div className="space-y-3">
            {sessionsByDay[day].map((session, i) => (
              <ScrollReveal key={session.id} delay={i * 80}>
                <SessionCard
                  session={session}
                  speaker={speakerMap.get(session.speakerId)}
                />
              </ScrollReveal>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
