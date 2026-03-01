"use client";

import { useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@common/components/ui/Tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PersonalCalendar } from "@/components/my-calendar/PersonalCalendar";
import { SessionPool } from "@/components/my-calendar/SessionPool";
import { useCalendarStore } from "@/lib/stores/calendarStore";
import { EVENT_INFO } from "@/data/event";

export default function MyCalendarPage() {
  const [activeDay, setActiveDay] = useState<1 | 2 | 3>(1);
  const addSession = useCalendarStore((s) => s.addSession);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id) {
      addSession(String(active.id));
    }
  };

  const formatDayLabel = (dateStr: string, dayNum: number) => {
    const date = new Date(dateStr + "T12:00:00");
    return `Day ${dayNum} · ${format(date, "EEE, MMM d")}`;
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <PageHeader
        title="My Calendar"
        subtitle="Build your personal schedule by adding sessions"
      />

      <Tabs
        defaultValue="day-1"
        onValueChange={(v) => setActiveDay(Number(v.split("-")[1]) as 1 | 2 | 3)}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="day-1">
            {formatDayLabel(EVENT_INFO.dates.day1, 1)}
          </TabsTrigger>
          <TabsTrigger value="day-2">
            {formatDayLabel(EVENT_INFO.dates.day2, 2)}
          </TabsTrigger>
          <TabsTrigger value="day-3">
            {formatDayLabel(EVENT_INFO.dates.day3, 3)}
          </TabsTrigger>
        </TabsList>

        {([1, 2, 3] as const).map((day) => (
          <TabsContent key={day} value={`day-${day}`}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
              <SessionPool dayFilter={day} />
              <PersonalCalendar day={day} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </DndContext>
  );
}
