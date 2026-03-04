"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Badge } from "@common/components/ui/badge";
import { Clock, MapPin, ArrowLeft, Calendar } from "lucide-react";
import { SESSIONS } from "@/data/sessions";
import { SPEAKERS } from "@/data/speakers";
import { formatTimeRange } from "@/lib/time";

const TRACK_BADGE_COLORS: Record<string, string> = {
  Leadership: "bg-red-50 text-red-700 border-red-200",
  Technology: "bg-blue-50 text-blue-700 border-blue-200",
  Strategy: "bg-amber-50 text-amber-700 border-amber-200",
  Innovation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Culture: "bg-violet-50 text-violet-700 border-violet-200",
};

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const session = SESSIONS.find((s) => s.id === id);

  if (!session) notFound();

  const speaker = SPEAKERS.find((s) => s.id === session.speakerId);
  const trackColors = session.track
    ? TRACK_BADGE_COLORS[session.track] ?? "bg-gray-50 text-gray-700 border-gray-200"
    : "";

  const backMap: Record<string, { href: string; label: string }> = {
    agenda: { href: "/agenda", label: "Back to Agenda" },
    speakers: { href: "/speakers", label: "Back to Speakers" },
  };
  const back = backMap[from ?? ""] ?? { href: "/sessions", label: "Back to Sessions" };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href={back.href}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {back.label}
      </Link>

      {/* Track */}
      {session.track && (
        <div className="mb-2">
          <Badge variant="outline" className={`text-xs ${trackColors}`}>
            {session.track}
          </Badge>
        </div>
      )}

      {/* Tags */}
      {session.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {session.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {session.title}
      </h1>

      {/* Meta */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>Day {session.day}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>{formatTimeRange(session.startTime, session.endTime)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          <span>{session.location}</span>
        </div>
      </div>

      {/* Speaker */}
      {speaker && (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-gradient-to-br from-primary/[0.03] to-transparent p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {speaker.initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{speaker.name}</p>
            <p className="text-xs text-muted-foreground">
              {speaker.title}, {speaker.company}
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mt-6">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          About this session
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {session.description}
        </p>
      </div>
    </div>
  );
}
