"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@common/components/ui/Tabs";
import { cn } from "@common/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventOverview } from "@/components/agenda/EventOverview";
import { DayCalendar } from "@/components/agenda/DayCalendar";
import { DayRecapPopup } from "@/components/agenda/DayRecapPopup";
import { SESSIONS } from "@/data/sessions";  // REPLACE ALL OF THESE DATA IMPORTS WITH API
import { SPEAKERS } from "@/data/speakers";  // ^
import { EVENT_INFO } from "@/data/event";   // ^
import { DAY_RECAPS } from "@/data/day-recaps"; // ^
import { FileText } from "lucide-react";

export default function AgendaPage() {
  const [activeDay, setActiveDay] = useState<string>("day-1");
  const [recapDay, setRecapDay] = useState<1 | 2 | 3 | null>(null);

  const activeDayNum = Number(activeDay.replace("day-", "")) as 1 | 2 | 3;

  const sessionsByDay = useMemo(() => {
    return {
      1: SESSIONS.filter((s) => s.day === 1),
      2: SESSIONS.filter((s) => s.day === 2),
      3: SESSIONS.filter((s) => s.day === 3),
    };
  }, []);

  const daySpeakers = useMemo(() => {
    const daySessions = sessionsByDay[activeDayNum];
    const speakerIds = [...new Set(daySessions.map((s) => s.speakerId))];
    return speakerIds
      .map((id) => SPEAKERS.find((sp) => sp.id === id))
      .filter(Boolean) as typeof SPEAKERS;
  }, [activeDayNum, sessionsByDay]);

  const handleRecapClick = (dayNum: 1 | 2 | 3) => {
    setRecapDay(dayNum);
  };

  const formatDayLabel = (dateStr: string, dayNum: number) => {
    const date = new Date(dateStr + "T12:00:00");
    return `Day ${dayNum} · ${format(date, "EEEE, MMM d")}`;
  };

  const days = [
    { value: "day-1", date: EVENT_INFO.dates.day1, num: 1 },
    { value: "day-2", date: EVENT_INFO.dates.day2, num: 2 },
    { value: "day-3", date: EVENT_INFO.dates.day3, num: 3 },
  ] as const;

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Three days of strategic sessions, workshops, and keynotes"
      />

      <EventOverview speakers={daySpeakers} />

      <Tabs defaultValue="day-1" onValueChange={setActiveDay}>
        <TabsList className="mb-6 flex items-start gap-2 bg-transparent p-0">
          {days.map((day) => (
            <div
              key={day.value}
              className="flex flex-col items-start gap-1.5"
            >
              <div
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
              {day.num === 1 && (
                <button
                  onClick={() => handleRecapClick(1)}
                  className="flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.04] px-2.5 py-1 text-[11px] font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/25"
                >
                  <FileText className="h-3 w-3" />
                  Day 1 Recap
                </button>
              )}
            </div>
          ))}
        </TabsList>

        <TabsContent value="day-1">
          <DayCalendar
            sessions={sessionsByDay[1]}
            speakers={SPEAKERS}
          />
        </TabsContent>
        <TabsContent value="day-2">
          <DayCalendar
            sessions={sessionsByDay[2]}
            speakers={SPEAKERS}
          />
        </TabsContent>
        <TabsContent value="day-3">
          <DayCalendar
            sessions={sessionsByDay[3]}
            speakers={SPEAKERS}
          />
        </TabsContent>
      </Tabs>

      <DayRecapPopup
        recap={recapDay ? DAY_RECAPS.find((r) => r.day === recapDay) : undefined}
        open={recapDay !== null}
        onClose={() => setRecapDay(null)}
      />
    </>
  );
}
