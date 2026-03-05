import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import {
  getAzureOpenAIClient,
  getDeploymentNameMini,
} from "@/lib/azure-openai";
import type { DayRecapData } from "@/data/recap-types";
import { gatherRecapData, type RawRecapData } from "./gather-recap-data";
import {
  computeStats,
  computeDayNumber,
  formatRecapDate,
  computeEnergyCurve,
  computeTrendingWords,
  type EnergyCurvePoint,
  type TrendingWord,
} from "./compute-stats";

// ─── helpers ──────────────────────────────────────────────────

async function chatJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const client = getAzureOpenAIClient();
  const res = await client.chat.completions.create({
    model: getDeploymentNameMini(),
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return JSON.parse(res.choices[0].message.content!) as T;
}

// ─── individual LLM calls ─────────────────────────────────────

async function generateHeadlines(
  sessions: RawRecapData["daySessions"]
): Promise<DayRecapData["headlines"]> {
  const sessionData = sessions.map((s) => ({
    title: s.title,
    description: s.description,
    location: s.location,
    speakers: s.speakers.map((sp) => sp.name).join(", "),
    comments: s.commentCount,
    upvotes: s.upvoteCount,
  }));

  const result = await chatJson<{ headlines: DayRecapData["headlines"] }>(
    `You are a newspaper editor. For each conference session, write a catchy newspaper headline and a 1-2 sentence summary. Set "hot" to true for the top 1-2 most engaging sessions (highest comments + upvotes).
Return JSON: { "headlines": [{ "session": "<title>", "headline": "<headline>", "summary": "<summary>", "room": "<location>", "messages": <comments>, "hot": <bool> }] }`,
    JSON.stringify(sessionData)
  );
  return result.headlines;
}

async function generateQuotesAndMysteries(
  raw: RawRecapData
): Promise<{ topQuotes: DayRecapData["topQuotes"]; mysteries: string[] }> {
  const allMessages = [
    ...raw.networkingMsgs.map((m) => ({
      text: m.content,
      author: m.authorName,
      source: "chat",
    })),
    ...raw.sessionCommentsList.map((m) => ({
      text: m.content,
      author: m.authorName,
      source: `session: ${m.sessionTitle}`,
    })),
  ];

  if (allMessages.length === 0) {
    return { topQuotes: [], mysteries: [] };
  }

  const result = await chatJson<{
    topQuotes: DayRecapData["topQuotes"];
    mysteries: string[];
  }>(
    `You are a newspaper editor reviewing conference messages.
Select 3-5 notable/insightful/funny quotes with the original author names and assign a "reactions" score (1-50) based on how impactful the quote is.
Also extract 3-5 interesting unanswered questions or mysteries from the conversation.
Return JSON: { "topQuotes": [{ "text": "<quote>", "author": "<name>", "reactions": <number> }], "mysteries": ["<question>", ...] }`,
    JSON.stringify(allMessages.slice(0, 200)) // cap for token limits
  );
  return result;
}

async function generateAwards(
  sessions: RawRecapData["daySessions"],
  raw: RawRecapData
): Promise<DayRecapData["awards"]> {
  const context = {
    sessions: sessions.map((s) => ({
      title: s.title,
      comments: s.commentCount,
      upvotes: s.upvoteCount,
      speakers: s.speakers.map((sp) => sp.name),
    })),
    totalMessages:
      raw.networkingMsgs.length + raw.sessionCommentsList.length,
    totalConnections: raw.newConnectionsCount,
  };

  const result = await chatJson<{ awards: DayRecapData["awards"] }>(
    `You are a fun awards show host for a conference. Generate 4-6 creative, lighthearted awards based on the day's activity data. Each award should have an emoji, a short title, and a detail line.
Examples: "🎤 Mic Drop Moment", "🔥 Hottest Take", "🤝 Connector of the Day"
Return JSON: { "awards": [{ "emoji": "<emoji>", "title": "<title>", "detail": "<detail>" }] }`,
    JSON.stringify(context)
  );
  return result.awards;
}

async function generateWordCloudAndLabels(
  trending: TrendingWord[],
  energyCurve: EnergyCurvePoint[]
): Promise<{
  wordCloud: DayRecapData["wordCloud"];
  energyLabels: Record<string, string>;
}> {
  const result = await chatJson<{
    wordCloud: DayRecapData["wordCloud"];
    energyLabels: Record<string, string>;
  }>(
    `You have two tasks:
1. Word Cloud: Categorize each trending word as "trending", "unique", or "common" and assign a weight (1-10). Trending = hot topic, Unique = unusual/interesting, Common = frequently used but expected.
2. Energy Labels: For each time slot in the energy curve, write a short creative label (2-4 words) describing the vibe (e.g., "Morning Coffee Buzz", "Post-Lunch Dip", "Closing Sprint").
Return JSON: { "wordCloud": [{ "word": "<word>", "weight": <1-10>, "type": "trending"|"unique"|"common" }], "energyLabels": { "08:00": "<label>", ... } }`,
    JSON.stringify({ trending, energyCurve })
  );
  return result;
}

async function generateTagline(
  headlines: DayRecapData["headlines"],
  awards: DayRecapData["awards"],
  trending: TrendingWord[],
  stats: DayRecapData["stats"]
): Promise<{ tagline: string }> {
  const result = await chatJson<{ tagline: string }>(
    `Write one punchy, newspaper-worthy tagline (max 15 words) summarizing this conference day. Be creative, witty, and capture the energy.
Return JSON: { "tagline": "<tagline>" }`,
    JSON.stringify({
      headlines: headlines.map((h) => h.headline),
      awards: awards.map((a) => a.title),
      topTrending: trending.slice(0, 5).map((t) => t.word),
      stats,
    })
  );
  return result;
}

// ─── save to DB ───────────────────────────────────────────────

async function saveRecapToEvent(
  eventId: string,
  date: string,
  recap: DayRecapData
) {
  // Use jsonb_set to update only our key without clobbering other dates
  await db
    .update(events)
    .set({
      recaps: sql`jsonb_set(COALESCE(${events.recaps}, '{}'::jsonb), ${sql.raw(`'{${date}}'`)}, ${sql`${JSON.stringify(recap)}::jsonb`})`,
    })
    .where(eq(events.id, eventId));
}

async function clearRecapLoading(eventId: string, date: string) {
  await db
    .update(events)
    .set({
      recaps: sql`COALESCE(${events.recaps}, '{}'::jsonb) - ${date}`,
    })
    .where(eq(events.id, eventId));
}

// ─── main orchestrator ────────────────────────────────────────

export async function generateDayRecap(
  eventId: string,
  date: string
): Promise<void> {
  try {
    const raw = await gatherRecapData(eventId, date);
    const stats = computeStats(raw);
    const dayNumber = computeDayNumber(date, raw.event.startDate);
    const formattedDate = formatRecapDate(date);
    const energyRaw = computeEnergyCurve(raw);
    const trending = computeTrendingWords(raw);

    // Parallel LLM calls
    const [headlines, quotesAndMysteries, awards, wordCloudAndLabels] =
      await Promise.all([
        generateHeadlines(raw.daySessions),
        generateQuotesAndMysteries(raw),
        generateAwards(raw.daySessions, raw),
        generateWordCloudAndLabels(trending, energyRaw),
      ]);

    // Merge energy labels
    const energyCurve = energyRaw.map((p) => ({
      ...p,
      label: wordCloudAndLabels.energyLabels[p.time] ?? "",
    }));

    // Sequential: tagline needs prior results
    const { tagline } = await generateTagline(
      headlines,
      awards,
      trending,
      stats
    );

    const recap: DayRecapData = {
      conference: raw.event.title,
      day: dayNumber,
      date: formattedDate,
      tagline,
      stats,
      energyCurve,
      headlines,
      topQuotes: quotesAndMysteries.topQuotes,
      mysteries: quotesAndMysteries.mysteries,
      awards,
      trending,
      wordCloud: wordCloudAndLabels.wordCloud,
      generatedAt: new Date().toISOString(),
    };

    await saveRecapToEvent(eventId, date, recap);
  } catch (error) {
    console.error(`[recap] Failed to generate recap for ${eventId}/${date}:`, error);
    // Clear "loading" state so it can be retried
    await clearRecapLoading(eventId, date).catch(() => {});
    throw error;
  }
}
