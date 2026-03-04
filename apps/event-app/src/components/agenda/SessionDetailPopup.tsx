"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, MapPin, User } from "lucide-react";
import type { Session, Speaker } from "@/data/types";
import { formatTimeRange } from "@/lib/time";

interface SessionDetailPopupProps {
  session: Session | null;
  speaker: Speaker | undefined;
  open: boolean;
  onClose: () => void;
}

const TRACK_COLORS: Record<string, string> = {
  Leadership: "bg-red-50 text-red-700 border-red-200",
  Technology: "bg-blue-50 text-blue-700 border-blue-200",
  Strategy: "bg-amber-50 text-amber-700 border-amber-200",
  Innovation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Culture: "bg-violet-50 text-violet-700 border-violet-200",
};

export function SessionDetailPopup({
  session,
  speaker,
  open,
  onClose,
}: SessionDetailPopupProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !session) return null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {session.track && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${TRACK_COLORS[session.track] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
                  >
                    {session.track}
                  </span>
                )}
                {(session.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {session.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatTimeRange(session.startTime, session.endTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{session.location}</span>
            </div>
            {speaker && (
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>
                  {speaker.name}, {speaker.title}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {session.description}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
