"use client";

import Link from "next/link";
import { cn } from "@common/lib/utils";
import type { Session, Speaker } from "@/data/types";
import { MapPin, Clock } from "lucide-react";
import { formatTimeRange } from "@/lib/time";

interface SessionBlockProps {
  session: Session;
  speakers: Speaker[];
  from?: string;
}

const TRACK_COLORS: Record<string, string> = {
  Leadership: "border-l-primary",
  Technology: "border-l-blue-500",
  Strategy: "border-l-amber-500",
  Innovation: "border-l-emerald-500",
  Culture: "border-l-violet-500",
};

export function SessionBlock({ session, speakers, from }: SessionBlockProps) {
  const trackColor = session.track
    ? TRACK_COLORS[session.track] ?? "border-l-gray-300"
    : "border-l-gray-300";

  const href = from
    ? `/sessions/${session.id}?from=${from}`
    : `/sessions/${session.id}`;

  return (
    <Link
      href={href}
      className={cn(
        "group block w-full rounded-lg border border-border bg-white p-3 text-left shadow-2xs transition-all duration-150 hover:shadow-sm",
        "border-l-[3px]",
        trackColor
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>
          {formatTimeRange(session.startTime, session.endTime)}
        </span>
        <span className="mx-0.5">·</span>
        <MapPin className="h-3 w-3" />
        <span>{session.location}</span>
      </div>
      <p className="text-sm font-medium leading-tight text-foreground group-hover:text-primary transition-colors">
        {session.title}
      </p>
      {speakers.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {speakers.map((s) => s.name).join(", ")}
        </p>
      )}
    </Link>
  );
}
