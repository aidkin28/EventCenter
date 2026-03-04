import type { Speaker } from "@/data/types";
import type { EventData } from "@/lib/stores/eventStore";

interface EventOverviewProps {
  event: EventData | null;
  speakers: Speaker[];
}

export function EventOverview({ event, speakers }: EventOverviewProps) {
  if (!event) return null;

  return (
    <section className="mb-10 rounded-2xl border border-border bg-gradient-to-br from-primary/[0.03] to-transparent p-8">
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          {event.venue} &middot; {event.location}
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {event.title}
        </h2>
        {event.description && (
          <p className="mt-1 text-lg font-medium text-muted-foreground">
            {event.description}
          </p>
        )}
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Featured Speakers
        </p>
        <div className="flex items-center gap-3">
          {speakers.map((speaker) => (
            <div key={speaker.id} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {speaker.initials}
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  {speaker.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {speaker.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
