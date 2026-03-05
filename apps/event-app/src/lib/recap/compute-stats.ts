import { format } from "date-fns";
import type { RawRecapData } from "./gather-recap-data";

// Stop words to filter from trending
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "to", "of",
  "in", "for", "on", "with", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "out", "off",
  "over", "under", "again", "further", "then", "once", "and", "but", "or",
  "nor", "not", "so", "yet", "both", "either", "neither", "each", "every",
  "all", "any", "few", "more", "most", "other", "some", "such", "no",
  "only", "own", "same", "than", "too", "very", "just", "because", "if",
  "when", "while", "about", "up", "down", "also", "it", "its", "i", "me",
  "my", "we", "our", "you", "your", "he", "she", "they", "them", "their",
  "this", "that", "these", "those", "what", "which", "who", "whom", "how",
  "where", "there", "here", "am", "im", "ive", "dont", "doesnt", "like",
  "get", "got", "going", "think", "know", "see", "say", "said", "make",
  "one", "two", "really", "right", "well", "thats", "yeah", "yes", "hey",
]);

export interface ComputedStats {
  attendees: number;
  messages: number;
  connections: number;
  sessions: number;
  breakoutRooms: number;
  siaCommands: number;
}

export interface EnergyCurvePoint {
  time: string;
  level: number;
  label: string;
}

export interface TrendingWord {
  word: string;
  count: number;
}

export function computeStats(raw: RawRecapData): ComputedStats {
  const allMsgCount =
    raw.networkingMsgs.length + raw.sessionCommentsList.length;

  const siaCount = [...raw.networkingMsgs, ...raw.sessionCommentsList].filter(
    (m) => /@sia\b/i.test(m.content)
  ).length;

  return {
    attendees: raw.attendeeCount,
    messages: allMsgCount,
    connections: raw.newConnectionsCount,
    sessions: raw.daySessions.length,
    breakoutRooms: raw.groupCount,
    siaCommands: siaCount,
  };
}

export function computeDayNumber(
  targetDate: string,
  eventStartDate: string
): number {
  const target = new Date(targetDate + "T12:00:00");
  const start = new Date(eventStartDate + "T12:00:00");
  return Math.floor((target.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function formatRecapDate(targetDate: string): string {
  return format(new Date(targetDate + "T12:00:00"), "EEEE, MMMM d");
}

export function computeEnergyCurve(
  raw: RawRecapData
): EnergyCurvePoint[] {
  const allMessages = [
    ...raw.networkingMsgs.map((m) => m.createdAt),
    ...raw.sessionCommentsList.map((m) => m.createdAt),
  ];

  // Group by hour
  const hourCounts = new Map<number, number>();
  for (const ts of allMessages) {
    const hour = new Date(ts).getUTCHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  // Build curve from 8am to 10pm
  const points: EnergyCurvePoint[] = [];
  const maxCount = Math.max(1, ...hourCounts.values());

  for (let h = 8; h <= 22; h++) {
    const raw = hourCounts.get(h) ?? 0;
    points.push({
      time: `${h.toString().padStart(2, "0")}:00`,
      level: Math.round((raw / maxCount) * 100),
      label: "", // LLM fills this
    });
  }

  return points;
}

export function computeTrendingWords(
  raw: RawRecapData
): TrendingWord[] {
  const allContent = [
    ...raw.networkingMsgs.map((m) => m.content),
    ...raw.sessionCommentsList.map((m) => m.content),
  ].join(" ");

  const words = allContent
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const counts = new Map<string, number>();
  for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
}
