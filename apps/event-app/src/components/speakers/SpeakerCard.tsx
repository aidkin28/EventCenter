import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { Speaker, Session } from "@/data/types";
import { SESSIONS } from "@/data/sessions";
import { formatTimeRange } from "@/lib/time";

interface SpeakerCardProps {
  speaker: Speaker;
}

const TRACK_COLORS: Record<string, string> = {
  Leadership: "border-l-primary",
  Technology: "border-l-blue-500",
  Strategy: "border-l-amber-500",
  Innovation: "border-l-emerald-500",
  Culture: "border-l-violet-500",
};

export function SpeakerCard({ speaker }: SpeakerCardProps) {
  const sessions = SESSIONS.filter((s) => s.speakerId === speaker.id);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header: info left, avatar right */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h3 className="text-2xl font-semibold tracking-tight text-foreground">
            {speaker.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-primary">{speaker.title}</p>
          <p className="text-xs text-muted-foreground">{speaker.company}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {speaker.bio}
          </p>
        </div>

        {/* Avatar */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
          <span className="text-2xl font-semibold text-primary">
            {speaker.initials}
          </span>
        </div>
      </div>

      {/* Sessions */}
      {sessions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sessions
          </p>
          <div className="grid gap-2">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const trackColor = session.track
    ? TRACK_COLORS[session.track] ?? "border-l-gray-300"
    : "border-l-gray-300";

  return (
    <Link
      href={`/sessions/${session.id}?from=speakers`}
      className={`block rounded-lg border border-border bg-gradient-to-br from-primary/[0.02] to-transparent p-3 border-l-[3px] transition-shadow hover:shadow-sm ${trackColor}`}
    >
      <p className="text-sm font-medium text-foreground">{session.title}</p>
      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Day {session.day} · {formatTimeRange(session.startTime, session.endTime)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {session.location}
        </span>
      </div>
    </Link>
  );
}
