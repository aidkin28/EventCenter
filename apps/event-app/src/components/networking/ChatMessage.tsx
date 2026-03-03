"use client";

import type { NetworkingMessage } from "@/lib/stores/networkingStore";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: NetworkingMessage;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-2.5",
        message.isAiSummary && "rounded-lg bg-primary/[0.03] p-2"
      )}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {message.isAiSummary ? "AI" : getInitials(message.userName)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-foreground">
            {message.isAiSummary ? "AI Summary" : message.userName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-foreground/80 break-words whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}
