import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  networkingGroups,
  eventSessions,
} from "@/db/schema";

export async function searchDiscussions(eventId: string): Promise<string> {
  const parts: string[] = [];

  // Fetch all networking groups with recent messages
  const groups = await db.query.networkingGroups.findMany({
    with: {
      messages: {
        limit: 50,
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        with: { user: true },
      },
    },
  });

  if (groups.length > 0) {
    parts.push("=== NETWORKING GROUP DISCUSSIONS ===");
    for (const group of groups) {
      parts.push(`\nGroup: ${group.name}`);
      if (group.description) parts.push(`Description: ${group.description}`);
      if (group.messages.length === 0) {
        parts.push("(No messages yet)");
      } else {
        for (const msg of group.messages) {
          const name = msg.user?.name ?? "Unknown";
          parts.push(`  [${name}]: ${msg.content}`);
        }
      }
    }
  }

  // Fetch session comments for this event's sessions
  const sessions = await db.query.eventSessions.findMany({
    where: eq(eventSessions.eventId, eventId),
    with: {
      comments: {
        limit: 30,
        orderBy: (comments, { desc }) => [desc(comments.createdAt)],
        with: { user: true },
      },
    },
  });

  const sessionsWithComments = sessions.filter((s) => s.comments.length > 0);
  if (sessionsWithComments.length > 0) {
    parts.push("\n=== SESSION COMMENTS ===");
    for (const session of sessionsWithComments) {
      parts.push(`\nSession: ${session.title}`);
      for (const comment of session.comments) {
        const name = comment.user?.name ?? "Unknown";
        parts.push(`  [${name}]: ${comment.content}`);
      }
    }
  }

  if (parts.length === 0) {
    return "No discussions or comments found for this event.";
  }

  return parts.join("\n");
}
