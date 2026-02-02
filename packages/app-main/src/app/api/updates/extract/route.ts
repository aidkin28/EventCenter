import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

const extractRequestSchema = z.object({
  updateText: z.string().min(10, "Update must be at least 10 characters"),
  updatePeriod: z.enum(["morning", "afternoon", "evening", "full_day"]),
  periodDate: z.string().transform((s) => new Date(s)),
});

interface ExtractedActivityFromPython {
  activity_type: string;
  quantity: number;
  summary: string;
  activity_date: string;
}

interface PythonExtractResponse {
  activities: ExtractedActivityFromPython[];
  raw_summary: string;
}

/**
 * POST /api/updates/extract - Parse update text and create DailyUpdate + ExtractedActivity records
 */
export async function POST(request: Request) {
  const authResult = await requireAuth({ rateLimit: "standard_llm" });
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = extractRequestSchema.parse(body);

    // Get user's active goal set (optional - updates can work without goals)
    const activeGoalSet = await prisma.userGoalSet.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
      orderBy: { createdAt: "desc" },
    });

    // Get user's active goals for potential linking
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

    // Check for existing update in same period (with or without goal set)
    const existingUpdate = await prisma.dailyUpdate.findFirst({
      where: {
        userId: user.id,
        ...(activeGoalSet ? { userGoalSetId: activeGoalSet.id } : {}),
        updatePeriod: validated.updatePeriod,
        periodDate: validated.periodDate,
      },
      include: {
        extractedActivities: true,
      },
    });

    // Call Python backend to extract activities
    const pythonBackendUrl =
      process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { timezone: true },
    });

    const extractResponse = await fetch(
      `${pythonBackendUrl}/api/v1/updates/extract-activities`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: validated.updateText,
          user_timezone: dbUser?.timezone || "UTC",
        }),
      }
    );

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      console.error("Python backend error:", errorText);
      return apiError(
        "Failed to extract activities",
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        502
      );
    }

    const extractResult: PythonExtractResponse = await extractResponse.json();

    // If existing update, APPEND to it instead of blocking
    if (existingUpdate) {
      const result = await prisma.$transaction(async (tx) => {
        // Append new text to existing update
        const updatedDailyUpdate = await tx.dailyUpdate.update({
          where: { id: existingUpdate.id },
          data: {
            updateText: existingUpdate.updateText + "\n\n---\n\n" + validated.updateText,
          },
        });

        // Create new activities linked to existing update
        const newActivities = await Promise.all(
          extractResult.activities.map(async (activity) => {
            const linkedGoalId = findMatchingGoal(activity, activeGoals);

            return tx.extractedActivity.create({
              data: {
                dailyUpdateId: existingUpdate.id,
                userId: user.id,
                activityType: activity.activity_type,
                quantity: activity.quantity,
                summary: activity.summary,
                activityDate: new Date(activity.activity_date),
                period: validated.updatePeriod,
                linkedGoalId,
              },
            });
          })
        );

        // Note: Don't update streak again - same day already counted

        return {
          dailyUpdate: updatedDailyUpdate,
          extractedActivities: [...existingUpdate.extractedActivities, ...newActivities],
          newActivities,
        };
      });

      return NextResponse.json(
        {
          update: result.dailyUpdate,
          extractedActivities: result.extractedActivities,
          rawSummary: extractResult.raw_summary,
          hasGoals: activeGoals.length > 0,
          linkedGoalsCount: result.extractedActivities.filter(a => a.linkedGoalId).length,
          appended: true,
          newActivitiesCount: result.newActivities.length,
        },
        { status: 200 }
      );
    }

    // Create DailyUpdate and ExtractedActivity records in a transaction (new update)
    const result = await prisma.$transaction(async (tx) => {
      // Create the daily update (goal set is optional)
      const dailyUpdate = await tx.dailyUpdate.create({
        data: {
          userId: user.id,
          userGoalSetId: activeGoalSet?.id || null,
          updateText: validated.updateText,
          updatePeriod: validated.updatePeriod,
          periodDate: validated.periodDate,
        },
      });

      // Create extracted activities, attempting to link to matching goals
      const extractedActivities = await Promise.all(
        extractResult.activities.map(async (activity) => {
          // Try to find a matching goal based on activity summary
          const linkedGoalId = findMatchingGoal(activity, activeGoals);

          return tx.extractedActivity.create({
            data: {
              dailyUpdateId: dailyUpdate.id,
              userId: user.id,
              activityType: activity.activity_type,
              quantity: activity.quantity,
              summary: activity.summary,
              activityDate: new Date(activity.activity_date),
              period: validated.updatePeriod,
              linkedGoalId,
            },
          });
        })
      );

      // Update user streak
      await updateStreak(tx, user.id);

      return { dailyUpdate, extractedActivities };
    });

    return NextResponse.json(
      {
        update: result.dailyUpdate,
        extractedActivities: result.extractedActivities,
        rawSummary: extractResult.raw_summary,
        hasGoals: activeGoals.length > 0,
        linkedGoalsCount: result.extractedActivities.filter(a => a.linkedGoalId).length,
        appended: false,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "updates/extract:POST");
  }
}

/**
 * Simple keyword matching to link activities to goals
 */
function findMatchingGoal(
  activity: ExtractedActivityFromPython,
  goals: Array<{ id: string; title: string; description: string }>
): string | null {
  if (goals.length === 0) return null;

  const activityText = `${activity.activity_type} ${activity.summary}`.toLowerCase();

  // Score each goal based on keyword overlap
  let bestMatch: { id: string; score: number } | null = null;

  for (const goal of goals) {
    const goalText = `${goal.title} ${goal.description}`.toLowerCase();
    const goalWords = goalText.split(/\s+/).filter(w => w.length > 3);

    let score = 0;
    for (const word of goalWords) {
      if (activityText.includes(word)) {
        score++;
      }
    }

    // Also check activity type keywords
    const typeKeywords: Record<string, string[]> = {
      experiments: ["experiment", "test", "research", "prototype", "explore"],
      product_demos: ["demo", "demonstration", "showcase", "present", "product"],
      mentoring: ["mentor", "coach", "teach", "guide", "help", "train"],
      presentations: ["present", "talk", "workshop", "training", "speak"],
      volunteering: ["volunteer", "community", "charity", "help", "donate"],
    };

    const keywords = typeKeywords[activity.activity_type] || [];
    for (const keyword of keywords) {
      if (goalText.includes(keyword)) {
        score += 2; // Boost for activity type match
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: goal.id, score };
    }
  }

  // Only return a match if score is above threshold
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
