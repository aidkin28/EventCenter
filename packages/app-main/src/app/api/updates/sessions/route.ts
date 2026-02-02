import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";

/**
 * GET /api/updates/sessions - Get user's chat session history
 *
 * Query params:
 * - sessionId: fetch a single session by ID (returns single object, not array)
 * - limit: number of sessions to return (default 10)
 * - offset: number of sessions to skip (default 0)
 * - status: filter by status (optional, default returns all)
 */
export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // If sessionId is provided, fetch single session
    if (sessionId) {
      const session = await prisma.chatSession.findFirst({
        where: {
          sessionId,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
          dailyUpdate: {
            include: {
              extractedActivities: true,
            },
          },
        },
      });

      if (!session) {
        return NextResponse.json({ session: null });
      }

      return NextResponse.json({
        session: {
          id: session.id,
          sessionId: session.sessionId,
          updatePeriod: session.updatePeriod,
          periodDate: session.periodDate.toISOString().split("T")[0],
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt?.toISOString() || null,
          status: session.status,
          messages: session.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
          })),
          extractedActivities:
            session.dailyUpdate?.extractedActivities.map((activity) => ({
              id: activity.id,
              activityType: activity.activityType,
              quantity: Number(activity.quantity),
              summary: activity.summary,
              activityDate: activity.activityDate.toISOString(),
            })) || [],
        },
      });
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const whereClause = {
      userId: user.id,
      ...(status ? { status } : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where: whereClause,
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
          dailyUpdate: {
            include: {
              extractedActivities: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.chatSession.count({ where: whereClause }),
    ]);

    // Transform the data for the frontend
    const transformedSessions = sessions.map((session) => ({
      id: session.id,
      sessionId: session.sessionId,
      updatePeriod: session.updatePeriod,
      periodDate: session.periodDate.toISOString(),
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() || null,
      status: session.status,
      messages: session.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
      extractedActivities:
        session.dailyUpdate?.extractedActivities.map((activity) => ({
          id: activity.id,
          activityType: activity.activityType,
          quantity: Number(activity.quantity),
          summary: activity.summary,
          activityDate: activity.activityDate.toISOString(),
        })) || [],
    }));

    return NextResponse.json({
      sessions: transformedSessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + sessions.length < total,
      },
    });
  } catch (error) {
    return handleApiError(error, "updates/sessions:GET");
  }
}
