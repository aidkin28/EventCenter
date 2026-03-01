"use client";

import { Badge } from "@common/components/ui/badge";
import { Clock, MapPin, User } from "lucide-react";
import type { Session, Speaker } from "@/data/types";
import { formatTimeRange } from "@/lib/time";
import { UpvoteButton } from "./UpvoteButton";

interface SessionCardProps {
  session: Session;
  speaker: Speaker | undefined;
}

const DAY_LABELS = { 1: "Day 1", 2: "Day 2", 3: "Day 3" } as const;

export function SessionCard({ session, speaker }: SessionCardProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Tags */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {DAY_LABELS[session.day]}
            </Badge>
            {session.track && (
              <Badge variant="outline" className="text-[10px]">
                {session.track}
              </Badge>
            )}
            {session.isUserSubmitted && (
              <Badge className="bg-primary/10 text-primary text-[10px] border-0">
                Proposed
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground">
            {session.title}
          </h3>

          {/* Metadata */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeRange(session.startTime, session.endTime)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {session.location}
            </span>
            {speaker && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {speaker.name}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {session.description}
          </p>
        </div>

        {/* Upvote */}
        <div className="flex-shrink-0 pt-1">
          <UpvoteButton sessionId={session.id} />
        </div>
      </div>
    </div>
  );
}
