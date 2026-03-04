"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendeeGrid } from "@/components/attendees/AttendeeGrid";
import { useEventStore } from "@/lib/stores/eventStore";
import { useEventAttendees } from "@/hooks/useEventData";

export default function AttendeesPage() {
  const [search, setSearch] = useState("");
  const currentEvent = useEventStore((s) => s.currentEvent);
  const { data: attendees } = useEventAttendees(currentEvent?.id);

  return (
    <>
      <PageHeader
        title="Attendees"
        subtitle={`${attendees.length} executives attending the offsite`}
        action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Attendees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors"
            />
          </div>
        }
      />
      <AttendeeGrid search={search} />
    </>
  );
}
