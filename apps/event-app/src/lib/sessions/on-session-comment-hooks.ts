import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionComments, eventSessions, users } from "@/db/schema";
import { getModelMini } from "@/lib/ai/model";
import { getDeploymentNameMini } from "@/lib/azure-openai";
import { getRequiredEnv } from "@/lib/environment";
import { broadcastToGroup } from "@/lib/pubsub";
import { createId } from "@/lib/utils";

const SIA_USER_ID = "sia-agent";

let siaUserEnsured = false;

async function ensureSiaUser() {
  if (siaUserEnsured) return;
  const existing = await db.query.users.findFirst({
    where: eq(users.id, SIA_USER_ID),
    columns: { id: true },
  });
  if (!existing) {
    await db.insert(users).values({
      id: SIA_USER_ID,
      email: "sia@system.local",
      name: "Sia",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "user",
      blocked: false,
    }).onConflictDoNothing();
  }
  siaUserEnsured = true;
}

// ---------------------------------------------------------------------------
// Tool: web_search (Azure OpenAI Responses API + web_search_preview)
// ---------------------------------------------------------------------------

function getAzureBaseUrl(): string {
  const raw = getRequiredEnv("AZURE_OPENAI_ENDPOINT");
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return raw.replace(/\/openai\/.*$/, "").replace(/\/$/, "");
  }
}

const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description:
    "Search the web for information on a topic. Use this to research questions, verify facts, or find relevant articles.",
  schema: z.object({
    query: z.string().describe("The search query"),
  }),
  func: async ({ query }) => {
    try {
      const baseUrl = getAzureBaseUrl();
      const apiKey = getRequiredEnv("AZURE_OPENAI_API_KEY");
      const model = getDeploymentNameMini();

      const res = await fetch(`${baseUrl}/openai/v1/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          tools: [{ type: "web_search_preview" }],
          input: query,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[sia-session] web_search HTTP ${res.status}:`, body);
        return `Search failed (${res.status}). Respond based on your existing knowledge.`;
      }

      const data = await res.json();
      const outputMessage = data.output?.find(
        (item: { type: string }) => item.type === "message"
      );
      const text = outputMessage?.content?.[0]?.text;
      return text || "No results found.";
    } catch (error) {
      console.error("[sia-session] web_search error:", error);
      return "Search failed. Respond based on your existing knowledge.";
    }
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessages(
  msgs: { userName: string | null; content: string; createdAt: Date }[]
): string {
  return msgs
    .map((m) => {
      const time = m.createdAt.toISOString().slice(11, 16);
      return `[${m.userName ?? "Unknown"}] (${time}) ${m.content}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Tool: post_reply_to_session
// ---------------------------------------------------------------------------

function makePostReplyTool(sessionId: string) {
  return new DynamicStructuredTool({
    name: "post_reply_to_session",
    description:
      "Post a reply message to the current session chat as Sia.",
    schema: z.object({
      message: z
        .string()
        .describe("The message content to post (do NOT include a sender signature)"),
    }),
    func: async ({ message }) => {
      try {
        await ensureSiaUser();

        const commentId = createId();
        const [siaComment] = await db
          .insert(sessionComments)
          .values({
            id: commentId,
            sessionId,
            userId: SIA_USER_ID,
            content: message,
            isAiSummary: true,
          })
          .returning();

        await broadcastToGroup(`session:${sessionId}`, {
          type: "message:new",
          data: { ...siaComment, userName: "Sia" },
        });

        return "Message posted successfully.";
      } catch (error) {
        console.error("[sia-session] post_reply error:", error);
        return "Failed to post message. Please try again.";
      }
    },
  });
}

// ---------------------------------------------------------------------------
// runSiaSessionAgent
// ---------------------------------------------------------------------------

async function runSiaSessionAgent(
  sessionId: string,
  _userId: string,
  _userName: string
): Promise<void> {
  try {
    await ensureSiaUser();

    // Fetch session info for context
    const session = await db.query.eventSessions.findFirst({
      where: eq(eventSessions.id, sessionId),
      columns: { title: true, description: true },
    });

    // Fetch last 50 non-AI comments
    const allComments = await db
      .select({
        content: sessionComments.content,
        userName: users.name,
        createdAt: sessionComments.createdAt,
      })
      .from(sessionComments)
      .leftJoin(users, eq(sessionComments.userId, users.id))
      .where(
        and(
          eq(sessionComments.sessionId, sessionId),
          eq(sessionComments.isAiSummary, false)
        )
      )
      .orderBy(desc(sessionComments.createdAt))
      .limit(50);

    if (allComments.length === 0) return;

    const contextMessages = allComments.reverse();
    const recentMessages = contextMessages.slice(-5);

    const sessionContext = session
      ? `\nSESSION: "${session.title}"${session.description ? `\nDESCRIPTION: ${session.description}` : ""}`
      : "";

    const systemPrompt = `You are Sia, a friendly AI participant in a session discussion chat.
You sound like a knowledgeable colleague, not a bot.
${sessionContext}

CONVERSATION CONTEXT (last ${contextMessages.length} messages):
${formatMessages(contextMessages)}

RECENT MESSAGES (last ${recentMessages.length}):
${formatMessages(recentMessages)}

INSTRUCTIONS:
- Focus primarily on the MOST RECENT message — that's who tagged you and what they want
- If it's a direct question or request (research, explain, summarize), use the appropriate tool
- If it's just conversational, reply in 1-2 short sentences like a colleague would
- Use the web_search tool only when the question genuinely needs research
- Use post_reply_to_session to post your response
- Never start with "Great question!" or other generic filler
- Do not introduce yourself or explain that you are an AI
- Keep responses relevant to the session topic when possible`;

    const postTool = makePostReplyTool(sessionId);

    const agent = createReactAgent({
      llm: getModelMini(),
      tools: [webSearchTool, postTool],
      prompt: systemPrompt,
    });

    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: "Respond to the recent messages based on your instructions.",
        },
      ],
    });

    // Check if agent already posted via tool — if not, post the final response
    const lastMessage = result.messages[result.messages.length - 1];
    const responseText =
      typeof lastMessage.content === "string" ? lastMessage.content : "";

    // If the agent used the post_reply tool, the message is already posted
    const usedPostTool = result.messages.some(
      (m: { type?: string; name?: string }) =>
        m.type === "tool" && m.name === "post_reply_to_session"
    );

    if (usedPostTool || !responseText.trim() || responseText.trim() === "__SKIP__") {
      return;
    }

    // Agent responded directly without using the tool — post it
    await ensureSiaUser();
    const commentId = createId();
    const [siaComment] = await db
      .insert(sessionComments)
      .values({
        id: commentId,
        sessionId,
        userId: SIA_USER_ID,
        content: responseText,
        isAiSummary: true,
      })
      .returning();

    await broadcastToGroup(`session:${sessionId}`, {
      type: "message:new",
      data: { ...siaComment, userName: "Sia" },
    });
  } catch (error) {
    console.error("[sia-session] runSiaSessionAgent error:", error);
  }
}

// ---------------------------------------------------------------------------
// onSessionCommentCreated — entry point from API route (fire-and-forget)
// ---------------------------------------------------------------------------

export function onSessionCommentCreated(
  sessionId: string,
  messageContent: string,
  userId: string,
  userName: string
): void {
  const hasSiaMention = /@sia\b/i.test(messageContent);

  if (hasSiaMention) {
    runSiaSessionAgent(sessionId, userId, userName).catch((err) =>
      console.error("[onSessionCommentCreated] sia error:", err)
    );
  }
}
