import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, commonErrors } from "@/lib/api-error";
import { getAzureOpenAIClient, getDeploymentName } from "@/lib/azure-openai";
import { getEventContext } from "@/lib/chat/event-context-cache";
import { searchDiscussions } from "@/lib/chat/search-discussions";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { attendees } from "@/db/schema";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

const SEARCH_DISCUSSIONS_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_discussions",
    description:
      "Search networking group messages and session comments. Use this when the user asks about discussions, conversations, what people are saying, networking topics, or community sentiment.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

function buildSystemPrompt(context: NonNullable<Awaited<ReturnType<typeof getEventContext>>>): string {
  const { event, sessions } = context;

  let prompt = `You are an AI assistant for the event "${event.title}".`;
  if (event.description) prompt += ` ${event.description}`;
  prompt += `\nDates: ${event.startDate} to ${event.endDate}`;
  if (event.venue) prompt += `\nVenue: ${event.venue}`;
  if (event.location) prompt += `\nLocation: ${event.location}`;

  if (sessions.length > 0) {
    prompt += "\n\n=== SESSIONS ===";
    for (const s of sessions) {
      prompt += `\n\nSession: ${s.title}`;
      if (s.description) prompt += `\nDescription: ${s.description}`;
      prompt += `\nDate: ${s.date}, ${s.startTime} - ${s.endTime}`;
      if (s.location) prompt += `\nRoom: ${s.location}`;
      if (s.track) prompt += `\nTrack: ${s.track}`;
      if (s.tags.length > 0) prompt += `\nTags: ${s.tags.join(", ")}`;
      if (s.speakers.length > 0) {
        prompt += `\nSpeakers:`;
        for (const sp of s.speakers) {
          prompt += `\n  - ${sp.name} (${sp.title}${sp.company ? `, ${sp.company}` : ""})`;
          if (sp.bio) prompt += ` — ${sp.bio}`;
        }
      }
    }
  }

  prompt += `\n\nInstructions:
- Answer questions about the event agenda, sessions, speakers, schedule, and logistics using the context above.
- If the user asks about discussions, what people are talking about, networking conversations, or community sentiment, use the search_discussions tool.
- Be concise and helpful. If you don't know something, say so.
- Format responses in a readable way suitable for a small chat widget.`;

  return prompt;
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth({ rateLimit: "standard_llm" });
    if (!authResult.success) return authResult.response;
    const { user } = authResult;

    const body = await request.json();
    const { message, history } = body as {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message || typeof message !== "string") {
      return commonErrors.badRequest("Message is required");
    }

    // Resolve event from attendee enrollment
    const attendee = await db.query.attendees.findFirst({
      where: eq(attendees.userId, user.id),
      with: { eventAttendees: { limit: 1 } },
    });

    const eventId = attendee?.eventAttendees?.[0]?.eventId;
    if (!eventId) {
      return commonErrors.notFound("Event enrollment");
    }

    const context = await getEventContext(eventId);
    if (!context) {
      return commonErrors.notFound("Event");
    }

    const client = getAzureOpenAIClient();
    const deployment = getDeploymentName();

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(context) },
    ];

    // Add conversation history (last 20 messages)
    if (history && Array.isArray(history)) {
      const recent = history.slice(-20);
      for (const msg of recent) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    // First completion — may trigger tool call
    const response = await client.chat.completions.create({
      model: deployment,
      messages,
      tools: [SEARCH_DISCUSSIONS_TOOL],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const choice = response.choices[0];

    // Handle tool call
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];

      if (toolCall.function.name === "search_discussions") {
        const discussionData = await searchDiscussions(eventId);

        messages.push(choice.message);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: discussionData,
        });

        const followUp = await client.chat.completions.create({
          model: deployment,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        });

        return NextResponse.json({
          content: followUp.choices[0].message.content ?? "I couldn't generate a response.",
        });
      }
    }

    return NextResponse.json({
      content: choice.message.content ?? "I couldn't generate a response.",
    });
  } catch (error) {
    return handleApiError(error, "chat");
  }
}
