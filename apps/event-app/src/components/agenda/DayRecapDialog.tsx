"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@common/components/ui/dialog";
import { Badge } from "@common/components/ui/badge";
import { ThumbsUp, Eye, MessageCircle, Clock, LayoutGrid } from "lucide-react";
import type { DayRecap } from "@/data/day-recaps";

interface DayRecapDialogProps {
  recap: DayRecap | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRACK_BADGE_COLORS: Record<string, string> = {
  Leadership: "bg-red-50 text-red-700 border-red-200",
  Technology: "bg-blue-50 text-blue-700 border-blue-200",
  Strategy: "bg-amber-50 text-amber-700 border-amber-200",
  Innovation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Culture: "bg-violet-50 text-violet-700 border-violet-200",
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function DayRecapDialog({ recap, open, onOpenChange }: DayRecapDialogProps) {
  if (!recap) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Day {recap.day} Recap</DialogTitle>
          <DialogDescription className="sr-only">
            Summary and analytics for Day {recap.day}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {recap.summary}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span>{recap.totalSessions} sessions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(recap.totalDurationMinutes)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {recap.trackBreakdown.map(({ track, count }) => (
              <Badge
                key={track}
                variant="outline"
                className={TRACK_BADGE_COLORS[track] ?? ""}
              >
                {track} ({count})
              </Badge>
            ))}
          </div>

          <div className="grid gap-3">
            <HighlightCard
              icon={<ThumbsUp className="h-4 w-4 text-primary" />}
              label="Most Upvoted"
              title={recap.mostUpvotedSession.title}
              stat={`${recap.mostUpvotedSession.upvotes} upvotes`}
            />
            <HighlightCard
              icon={<Eye className="h-4 w-4 text-blue-500" />}
              label="Most Viewed"
              title={recap.mostViewedSession.title}
              stat={`${recap.mostViewedSession.views} views`}
            />
            <HighlightCard
              icon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
              label="Most Discussed"
              title={recap.mostTalkativeSession.title}
              stat={`${recap.mostTalkativeSession.commentCount} comments`}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HighlightCard({
  icon,
  label,
  title,
  stat,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  stat: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{stat}</p>
    </div>
  );
}
