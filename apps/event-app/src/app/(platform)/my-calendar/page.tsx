"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@common/components/ui/Tabs";
import { cn } from "@common/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { PersonalCalendar } from "@/components/my-calendar/PersonalCalendar";
import { SessionPool } from "@/components/my-calendar/SessionPool";
import { useEventStore } from "@/lib/stores/eventStore";
import { useEventSessions } from "@/hooks/useEventData";

export default function MyCalendarPage() {
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const currentEvent = useEventStore((s) => s.currentEvent);
  const { data: sessions, isLoading } = useEventSessions(currentEvent?.id);

  const days = useMemo(() => {
    const dateSet = new Set(sessions.map((s) => s.date));
    return Array.from(dateSet).sort();
  }, [sessions]);

  const formatDayLabel = (dateStr: string, dayNum: number) => {
    const date = new Date(dateStr + "T12:00:00");
    return `Day ${dayNum} · ${format(date, "EEEE, MMM d")}`;
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="My Calendar" subtitle="Loading..." />
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading sessions...
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My Calendar"
        subtitle="Build your personal schedule by adding sessions"
      />

      <Tabs
        defaultValue="day-0"
        onValueChange={(v) => setActiveDayIndex(Number(v.replace("day-", "")))}
      >
        <TabsList className="mb-6 flex gap-2 bg-transparent p-0">
          {days.map((date, i) => (
            <div
              key={date}
              className={cn(
                "rounded-xl px-1 py-1 transition-colors",
                activeDayIndex === i
                  ? "bg-primary/15"
                  : "bg-primary/[0.06]"
              )}
            >
              <TabsTrigger value={`day-${i}`}>
                {formatDayLabel(date, i + 1)}
              </TabsTrigger>
            </div>
          ))}
        </TabsList>

        {days.map((date, i) => (
          <TabsContent key={date} value={`day-${i}`}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
              <SessionPool sessions={sessions} dateFilter={date} />
              <PersonalCalendar sessions={sessions} dateFilter={date} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
