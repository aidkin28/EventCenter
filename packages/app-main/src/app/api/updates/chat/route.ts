import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

const chatRequestSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1, "Message cannot be empty"),
  updatePeriod: z
    .enum(["morning", "afternoon", "evening", "full_day"])
    .default("full_day"),
  periodDate: z.string().optional(),
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedActivityFromPython {
  activity_type: string;
  quantity: number;
  summary: string;
  activity_date: string;
}

interface ProposedFollowUp {
  activity_index: number;
  activity_type: string;
  title: string;
  summary: string;
  suggested_days: number | null;
}

interface FollowUpConfirmationResult {
  approved_indices: number[];
  dismissed_indices: number[];
  session_id: string;
}

interface PythonChatResponse {
  session_id: string;
  assistant_message: string;
  needs_clarification: boolean;
  activities: ExtractedActivityFromPython[];
  raw_summary: string;
  chat_history: ChatMessage[];
  // Follow-up fields
  proposed_follow_ups: ProposedFollowUp[];
  follow_up_analysis_summary: string;
  awaiting_followup_confirmation: boolean;
  followup_confirmation_result: FollowUpConfirmationResult | null;
}

/**
 * POST /api/updates/chat - Conversational update extraction
 */
export async function POST(request: Request) {
  const authResult = await requireAuth({ rateLimit: "standard_llm" });
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = chatRequestSchema.parse(body);

    const pythonBackendUrl =
      process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { timezone: true },
    });

    const updatePeriod = validated.updatePeriod;
    const periodDate = validated.periodDate
      ? new Date(validated.periodDate)
      : new Date();

    // Check if chat session exists, create if not
    let chatSession = await prisma.chatSession.findUnique({
      where: { sessionId: validated.sessionId },
    });

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          sessionId: validated.sessionId,
          userId: user.id,
          updatePeriod,
          periodDate,
          status: "active",
        },
      });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: "user",
        content: validated.message,
      },
    });

    // Call Python backend chat endpoint
    const chatResponse = await fetch(
      `${pythonBackendUrl}/api/v1/updates/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: validated.sessionId,
          user_message: validated.message,
          user_timezone: dbUser?.timezone || "UTC",
        }),
      }
    );

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error("Python backend error:", errorText);
      return apiError(
        "Failed to process message",
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        502
      );
    }

    const chatResult: PythonChatResponse = await chatResponse.json();

    console.log("[FOLLOW-UP] Python response:", {
      awaiting_followup_confirmation: chatResult.awaiting_followup_confirmation,
      proposed_follow_ups_count: chatResult.proposed_follow_ups?.length || 0,
      followup_confirmation_result: chatResult.followup_confirmation_result,
      activities_count: chatResult.activities?.length || 0,
    });

    // Save assistant message
    await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: "assistant",
        content: chatResult.assistant_message,
      },
    });

    // If awaiting follow-up confirmation, return without saving yet
    if (chatResult.awaiting_followup_confirmation) {
      return NextResponse.json({
        ...chatResult,
        saved: false,
        awaitingFollowUpConfirmation: true,
      });
    }

    // If extraction is complete (no more clarification needed), save to database
    if (!chatResult.needs_clarification && chatResult.activities.length > 0) {
      // Get user's active goal set (optional)
      const activeGoalSet = await prisma.userGoalSet.findFirst({
        where: {
          userId: user.id,
          status: "active",
        },
        orderBy: { createdAt: "desc" },
      });

      // Get user's active goals for linking
      const activeGoals = await prisma.goal.findMany({
        where: {
          userId: user.id,
          status: "active",
        },
        select: {
          id: true,
          title: true,
          description: true,
        },
      });

      // Check for existing update
      const existingUpdate = await prisma.dailyUpdate.findFirst({
        where: {
          userId: user.id,
          updatePeriod,
          periodDate,
        },
        include: {
          extractedActivities: true,
        },
      });

      // Compile full update text from chat history
      const userMessages = chatResult.chat_history
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n");

      // If existing update, APPEND to it instead of blocking
      if (existingUpdate) {
        const result = await prisma.$transaction(async (tx) => {
          // Append new text to existing update
          const updatedDailyUpdate = await tx.dailyUpdate.update({
            where: { id: existingUpdate.id },
            data: {
              updateText: existingUpdate.updateText + "\n\n---\n\n" + userMessages,
            },
          });

          // Create new activities linked to existing update
          const newActivities = await Promise.all(
            chatResult.activities.map(async (activity) => {
              const linkedGoalId = findMatchingGoal(activity, activeGoals);

              return tx.extractedActivity.create({
                data: {
                  dailyUpdateId: existingUpdate.id,
                  userId: user.id,
                  activityType: activity.activity_type,
                  quantity: activity.quantity,
                  summary: activity.summary,
                  activityDate: new Date(activity.activity_date),
                  period: updatePeriod,
                  linkedGoalId,
                },
              });
            })
          );

          // Create follow-ups if user approved any
          const savedFollowUps: Array<{ id: string; title: string }> = [];
          console.log("[FOLLOW-UP] Checking for approved follow-ups (appending):", {
            hasConfirmationResult: !!chatResult.followup_confirmation_result,
            approved_indices: chatResult.followup_confirmation_result?.approved_indices,
            proposed_follow_ups_count: chatResult.proposed_follow_ups?.length || 0,
          });
          if (chatResult.followup_confirmation_result?.approved_indices?.length) {
            const { approved_indices } = chatResult.followup_confirmation_result;
            const proposedFollowUps = chatResult.proposed_follow_ups || [];
            console.log("[FOLLOW-UP] Saving approved follow-ups:", { approved_indices, proposedFollowUps });

            for (const index of approved_indices) {
              const proposal = proposedFollowUps[index];
              console.log(`[FOLLOW-UP] Processing index ${index}:`, { proposal });
              if (!proposal) {
                console.log(`[FOLLOW-UP] No proposal at index ${index}, skipping`);
                continue;
              }

              const activity = newActivities[proposal.activity_index];
              console.log(`[FOLLOW-UP] Activity for proposal:`, { activity_index: proposal.activity_index, activity: activity?.id });
              if (!activity) {
                console.log(`[FOLLOW-UP] No activity at index ${proposal.activity_index}, skipping`);
                continue;
              }

              // Calculate due date if suggested_days is provided
              const dueDate = proposal.suggested_days
                ? new Date(Date.now() + proposal.suggested_days * 24 * 60 * 60 * 1000)
                : null;

              console.log(`[FOLLOW-UP] Creating follow-up: ${proposal.title}`);
              const followUp = await tx.updateFollowUp.create({
                data: {
                  chatSessionId: chatSession.id,
                  extractedActivityId: activity.id,
                  userId: user.id,
                  title: proposal.title,
                  summary: proposal.summary,
                  activityType: proposal.activity_type || null,
                  status: "confirmed",
                  dueDate,
                },
              });

              savedFollowUps.push({ id: followUp.id, title: followUp.title });
              console.log(`[FOLLOW-UP] Saved follow-up: ${followUp.id}`);
            }
          }
          console.log(`[FOLLOW-UP] Total saved follow-ups: ${savedFollowUps.length}`);

          // Note: Don't update streak again - same day already counted

          // Mark chat session as completed
          // Note: Don't set dailyUpdateId when appending - the existing update
          // may already have a different session linked (unique constraint)
          await tx.chatSession.update({
            where: { id: chatSession.id },
            data: {
              endedAt: new Date(),
              status: "completed",
            },
          });

          return {
            dailyUpdate: updatedDailyUpdate,
            extractedActivities: [...existingUpdate.extractedActivities, ...newActivities],
            newActivities,
            savedFollowUps,
          };
        });

        return NextResponse.json({
          ...chatResult,
          saved: true,
          appended: true,
          update: result.dailyUpdate,
          extractedActivities: result.extractedActivities,
          newActivitiesCount: result.newActivities.length,
          savedFollowUps: result.savedFollowUps,
        });
      }

      // Save to database (new update)
      const result = await prisma.$transaction(async (tx) => {
        const dailyUpdate = await tx.dailyUpdate.create({
          data: {
            userId: user.id,
            userGoalSetId: activeGoalSet?.id || null,
            updateText: userMessages,
            updatePeriod,
            periodDate,
          },
        });

        const extractedActivities = await Promise.all(
          chatResult.activities.map(async (activity) => {
            const linkedGoalId = findMatchingGoal(activity, activeGoals);

            return tx.extractedActivity.create({
              data: {
                dailyUpdateId: dailyUpdate.id,
                userId: user.id,
                activityType: activity.activity_type,
                quantity: activity.quantity,
                summary: activity.summary,
                activityDate: new Date(activity.activity_date),
                period: updatePeriod,
                linkedGoalId,
              },
            });
          })
        );

        // Create follow-ups if user approved any
        const savedFollowUps: Array<{ id: string; title: string }> = [];
        console.log("[FOLLOW-UP] Checking for approved follow-ups (new update):", {
          hasConfirmationResult: !!chatResult.followup_confirmation_result,
          approved_indices: chatResult.followup_confirmation_result?.approved_indices,
          proposed_follow_ups_count: chatResult.proposed_follow_ups?.length || 0,
        });
        if (chatResult.followup_confirmation_result?.approved_indices?.length) {
          const { approved_indices } = chatResult.followup_confirmation_result;
          const proposedFollowUps = chatResult.proposed_follow_ups || [];
          console.log("[FOLLOW-UP] Saving approved follow-ups (new):", { approved_indices, proposedFollowUps });

          for (const index of approved_indices) {
            const proposal = proposedFollowUps[index];
            console.log(`[FOLLOW-UP] Processing index ${index}:`, { proposal });
            if (!proposal) {
              console.log(`[FOLLOW-UP] No proposal at index ${index}, skipping`);
              continue;
            }

            const activity = extractedActivities[proposal.activity_index];
            console.log(`[FOLLOW-UP] Activity for proposal:`, { activity_index: proposal.activity_index, activity: activity?.id });
            if (!activity) {
              console.log(`[FOLLOW-UP] No activity at index ${proposal.activity_index}, skipping`);
              continue;
            }

            // Calculate due date if suggested_days is provided
            const dueDate = proposal.suggested_days
              ? new Date(Date.now() + proposal.suggested_days * 24 * 60 * 60 * 1000)
              : null;

            console.log(`[FOLLOW-UP] Creating follow-up: ${proposal.title}`);
            const followUp = await tx.updateFollowUp.create({
              data: {
                chatSessionId: chatSession.id,
                extractedActivityId: activity.id,
                userId: user.id,
                title: proposal.title,
                summary: proposal.summary,
                activityType: proposal.activity_type || null,
                status: "confirmed",
                dueDate,
              },
            });

            savedFollowUps.push({ id: followUp.id, title: followUp.title });
            console.log(`[FOLLOW-UP] Saved follow-up: ${followUp.id}`);
          }
        }
        console.log(`[FOLLOW-UP] Total saved follow-ups (new): ${savedFollowUps.length}`);

        await updateStreak(tx, user.id);

        // Link chat session to daily update and mark as completed
        await tx.chatSession.update({
          where: { id: chatSession.id },
          data: {
            dailyUpdateId: dailyUpdate.id,
            endedAt: new Date(),
            status: "completed",
          },
        });

        return { dailyUpdate, extractedActivities, savedFollowUps };
      });

      return NextResponse.json({
        ...chatResult,
        saved: true,
        appended: false,
        update: result.dailyUpdate,
        extractedActivities: result.extractedActivities,
        savedFollowUps: result.savedFollowUps,
      });
    }

    // Still in clarification phase
    return NextResponse.json({
      ...chatResult,
      saved: false,
    });
  } catch (error) {
    return handleApiError(error, "updates/chat:POST");
  }
}

/**
 * DELETE /api/updates/chat - Clear chat session
 */
export async function DELETE(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return apiError("Session ID required", ErrorCode.BAD_REQUEST, 400);
    }

    const pythonBackendUrl =
      process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

    await fetch(`${pythonBackendUrl}/api/v1/updates/chat/${sessionId}`, {
      method: "DELETE",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "updates/chat:DELETE");
  }
}

function findMatchingGoal(
  activity: ExtractedActivityFromPython,
  goals: Array<{ id: string; title: string; description: string }>
): string | null {
  if (goals.length === 0) return null;

  const activityText =
    `${activity.activity_type} ${activity.summary}`.toLowerCase();

  let bestMatch: { id: string; score: number } | null = null;

  for (const goal of goals) {
    const goalText = `${goal.title} ${goal.description}`.toLowerCase();
    const goalWords = goalText.split(/\s+/).filter((w) => w.length > 3);

    let score = 0;
    for (const word of goalWords) {
      if (activityText.includes(word)) {
        score++;
      }
    }

    const typeKeywords: Record<string, string[]> = {
      experiments: ["experiment", "test", "research", "prototype", "explore"],
      product_demos: ["demo", "demonstration", "showcase", "present", "product"],
      mentoring: ["mentor", "coach", "teach", "guide", "help", "train"],
      presentations: ["present", "talk", "workshop", "training", "speak"],
      volunteering: ["volunteer", "community", "charity", "help", "donate"],
      general_task: ["task", "work", "meeting", "plan", "coordinate"],
      research_learning: ["learn", "study", "course", "read", "research"],
    };

    const keywords = typeKeywords[activity.activity_type] || [];
    for (const keyword of keywords) {
      if (goalText.includes(keyword)) {
        score += 2;
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: goal.id, score };
    }
  }

  return bestMatch && bestMatch.score >= 2 ? bestMatch.id : null;
}

async function updateStreak(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      streakCurrent: true,
      streakLongest: true,
      streakLastUpdate: true,
    },
  });

  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastUpdate = user.streakLastUpdate
    ? new Date(user.streakLastUpdate)
    : null;

  if (lastUpdate) {
    lastUpdate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor(
      (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      return;
    } else if (daysDiff === 1) {
      const newStreak = user.streakCurrent + 1;
      await tx.user.update({
        where: { id: userId },
        data: {
          streakCurrent: newStreak,
          streakLongest: Math.max(newStreak, user.streakLongest),
          streakLastUpdate: today,
          totalPoints: { increment: 20 },
        },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: {
          streakCurrent: 1,
          streakLastUpdate: today,
          totalPoints: { increment: 20 },
        },
      });
    }
  } else {
    await tx.user.update({
      where: { id: userId },
      data: {
        streakCurrent: 1,
        streakLastUpdate: today,
        totalPoints: { increment: 20 },
      },
    });
  }
}
