import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { networkingMessages, networkingGroups, networkingGroupMembers, users } from "@/db/schema";
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

/** Extract base origin from AZURE_OPENAI_ENDPOINT (may be a full URL with path) */
function getAzureBaseUrl(): string {
  const raw = getRequiredEnv("AZURE_OPENAI_ENDPOINT");
  try {
    const url = new URL(raw);
    return url.origin; // e.g. https://resource.cognitiveservices.azure.com
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

      const res = await fetch(
        `${baseUrl}/openai/v1/responses`,
        {
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
        }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[sia] web_search HTTP ${res.status}:`, body);
        return `Search failed (${res.status}). Respond based on your existing knowledge.`;
      }

      const data = await res.json();

      // Extract the text output from the responses API format
      const outputMessage = data.output?.find(
        (item: { type: string }) => item.type === "message"
      );
      const text = outputMessage?.content?.[0]?.text;

      if (!text) return "No results found.";
      return text;
    } catch (error) {
      console.error("[sia] web_search error:", error);
      return "Search failed. Respond based on your existing knowledge.";
    }
  },
});

// ---------------------------------------------------------------------------
// Tool: post_message_to_group
// ---------------------------------------------------------------------------

const postMessageToGroupTool = new DynamicStructuredTool({
  name: "post_message_to_group",
  description:
    "Post a message to a networking group as Sia. Use this when asked to send or add a message to a specific group.",
  schema: z.object({
    groupName: z.string().describe("The name of the target group (fuzzy match)"),
    message: z.string().describe("The message content to post"),
  }),
  func: async ({ groupName, message }) => {
    try {
      const allGroups = await db
        .select({ id: networkingGroups.id, name: networkingGroups.name })
        .from(networkingGroups);

      if (allGroups.length === 0) return "No groups exist yet.";

      const needle = groupName.toLowerCase();

      // Exact case-insensitive match first, then substring
      let match = allGroups.find(
        (g) => g.name.toLowerCase() === needle
      );
      if (!match) {
        match = allGroups.find((g) =>
          g.name.toLowerCase().includes(needle)
        );
      }
      if (!match) {
        match = allGroups.find((g) =>
          needle.includes(g.name.toLowerCase())
        );
      }

      if (!match) {
        const names = allGroups.map((g) => g.name).join(", ");
        return `Group "${groupName}" not found. Available groups: ${names}`;
      }

      await ensureSiaUser();

      const messageId = createId();
      const [siaMessage] = await db
        .insert(networkingMessages)
        .values({
          id: messageId,
          groupId: match.id,
          userId: SIA_USER_ID,
          content: message,
          isAiSummary: true,
        })
        .returning();

      await broadcastToGroup(match.id, {
        type: "message:new",
        data: { ...siaMessage, userName: "Sia" },
      });

      return `Message posted to "${match.name}" successfully.`;
    } catch (error) {
      console.error("[sia] post_message_to_group error:", error);
      return "Failed to post message. Please try again.";
    }
  },
});

// ---------------------------------------------------------------------------
// Tool: create_networking_group (factory — needs invoking user context)
// ---------------------------------------------------------------------------

function makeCreateNetworkingGroupTool(ctx: { invokingUserId: string; eventId: string | null }) {
  return new DynamicStructuredTool({
    name: "create_networking_group",
    description:
      "Create a new networking group. Use this when someone asks to create a group about a topic. The invoking user becomes the creator and Sia is added as a co-creator. Optionally post an opening message with relevant context.",
    schema: z.object({
      name: z.string().max(255).describe("Short group name (2-5 words)"),
      description: z.string().max(1000).optional().describe("A 1-2 sentence description of the group topic"),
      openingMessage: z.string().optional().describe("An opening message to kick off the conversation — include relevant context from the originating chat if available"),
    }),
    func: async ({ name, description, openingMessage }) => {
      try {
        await ensureSiaUser();

        const groupId = createId();

        // Creator = invoking user, co-creator = Sia
        const [group] = await db
          .insert(networkingGroups)
          .values({
            id: groupId,
            name,
            description: description ?? null,
            creatorId: ctx.invokingUserId,
            eventId: ctx.eventId,
            coCreatorIds: [SIA_USER_ID],
            memberCount: 2,
          })
          .returning();

        // Add both the invoking user and Sia as members
        await db.insert(networkingGroupMembers).values([
          { id: createId(), groupId, userId: ctx.invokingUserId },
          { id: createId(), groupId, userId: SIA_USER_ID },
        ]);

        // Post opening message if provided
        if (openingMessage?.trim()) {
          const messageId = createId();
          const [msg] = await db
            .insert(networkingMessages)
            .values({
              id: messageId,
              groupId,
              userId: SIA_USER_ID,
              content: openingMessage.trim(),
              isAiSummary: true,
            })
            .returning();

          await broadcastToGroup(groupId, {
            type: "message:new",
            data: { ...msg, userName: "Sia" },
          });
        }

        return `Group "${group.name}" created successfully! People can find and join it from the networking page.`;
      } catch (error) {
        console.error("[sia] create_networking_group error:", error);
        return "Failed to create the group. Please try again.";
      }
    },
  });
}

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

function buildSystemPrompt(
  contextMessages: { userName: string | null; content: string; createdAt: Date }[],
  recentMessages: { userName: string | null; content: string; createdAt: Date }[],
  hasMention: boolean
): string {
  const mentionInstructions = hasMention
    ? `- Respond to ALL messages that mention @sia — these are direct requests to you
- Use the web_search tool to research topics when helpful
- Use post_message_to_group when asked to send a message to another group
- Use create_networking_group when asked to create a new group — pick a short name, add a description, and write an opening message that includes relevant context from the current conversation`
    : `- You are auto-joining this conversation to add value — no one asked you directly
- Pick ONE thing from recent messages: an insight, a related idea, a quick fact, a suggestion, or a friendly comment
- Do NOT repeat or summarize what others already said — add something new
- Match the tone of the group: concise, friendly, professional
- Keep it to 1-2 short sentences max — like a helpful colleague chiming in
- If nothing interesting warrants a comment, reply with exactly: __SKIP__`;

  return `You are Sia, a friendly AI participant in a group networking chat.
You sound like a knowledgeable colleague, not a bot.

CONVERSATION CONTEXT (last ${contextMessages.length} messages):
${formatMessages(contextMessages)}

RECENT MESSAGES (last ${recentMessages.length}):
${formatMessages(recentMessages)}

INSTRUCTIONS:
${mentionInstructions}
- Use the web_search tool to look things up when it would genuinely help
- Never start with "Great question!" or other generic filler
- Do not introduce yourself or explain that you are an AI`;
}

// ---------------------------------------------------------------------------
// runSiaAgent — triggered from networking group chat context
// ---------------------------------------------------------------------------

export async function runSiaAgent(groupId: string, invokingUserId: string): Promise<void> {
  try {
    await ensureSiaUser();

    // Resolve the group's eventId for creating related groups
    const group = await db.query.networkingGroups.findFirst({
      where: eq(networkingGroups.id, groupId),
      columns: { eventId: true },
    });

    // Fetch last 50 non-AI messages with user names
    const allMessages = await db
      .select({
        content: networkingMessages.content,
        userName: users.name,
        createdAt: networkingMessages.createdAt,
      })
      .from(networkingMessages)
      .leftJoin(users, eq(networkingMessages.userId, users.id))
      .where(
        and(
          eq(networkingMessages.groupId, groupId),
          eq(networkingMessages.isAiSummary, false)
        )
      )
      .orderBy(desc(networkingMessages.createdAt))
      .limit(50);

    if (allMessages.length === 0) return;

    // Reverse to chronological order
    const contextMessages = allMessages.reverse();
    const recentMessages = contextMessages.slice(-5);

    // Detect if any recent message @mentions Sia
    const hasMention = recentMessages.some((m) =>
      /@sia\b/i.test(m.content)
    );

    const systemPrompt = buildSystemPrompt(contextMessages, recentMessages, hasMention);

    const createGroupTool = makeCreateNetworkingGroupTool({
      invokingUserId,
      eventId: group?.eventId ?? null,
    });

    const agent = createReactAgent({
      llm: getModelMini(),
      tools: [webSearchTool, postMessageToGroupTool, createGroupTool],
      prompt: systemPrompt,
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: "Respond to the recent messages based on your instructions." }],
    });

    // Extract final AI response
    const lastMessage = result.messages[result.messages.length - 1];
    const responseText =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : "";

    // Skip if empty or explicit skip
    if (!responseText.trim() || responseText.trim() === "__SKIP__") return;

    // Insert Sia's message
    const messageId = createId();
    const [siaMessage] = await db
      .insert(networkingMessages)
      .values({
        id: messageId,
        groupId,
        userId: SIA_USER_ID,
        content: responseText,
        isAiSummary: true,
      })
      .returning();

    // Broadcast to group
    await broadcastToGroup(groupId, {
      type: "message:new",
      data: { ...siaMessage, userName: "Sia" },
    });
  } catch (error) {
    console.error("[sia] runSiaAgent error:", error);
  }
}

// ---------------------------------------------------------------------------
// runSiaCommand — entry point for ChatWidget / session chats (no groupId)
// ---------------------------------------------------------------------------

export async function runSiaCommand(
  rawMessage: string,
  invokingUserId: string,
  eventId: string | null
): Promise<{ content: string }> {
  // Strip @sia prefix
  const stripped = rawMessage.replace(/@sia\s*/i, "").trim();

  const systemPrompt = `You are Sia, an AI research assistant.
The user has invoked you with a command. Determine the intent and act accordingly:

- If the message asks to "create a group" or "create networking group" about a topic, use the create_networking_group tool. Pick a short, clear group name (2-5 words). Write a brief description. Write an opening message that summarizes relevant context from the user's message to kick off the conversation.
- If the message starts with "research" or is a general question/topic, use the web_search tool to find relevant information and provide a concise, well-cited answer.
- If the message starts with "add message to" followed by a group name and message content, use the post_message_to_group tool to post the message.
- For anything else, do your best to help using the available tools.

Keep responses concise and helpful.`;

  const createGroupTool = makeCreateNetworkingGroupTool({ invokingUserId, eventId });

  const agent = createReactAgent({
    llm: getModelMini(),
    tools: [webSearchTool, postMessageToGroupTool, createGroupTool],
    prompt: systemPrompt,
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: stripped || rawMessage }],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  const content =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : "I couldn't process that request.";

  return { content };
}
