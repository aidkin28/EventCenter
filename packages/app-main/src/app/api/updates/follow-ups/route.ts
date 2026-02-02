import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";
import { Prisma } from "@chat-assistant/database";

/**
 * GET /api/updates/follow-ups - Get user's follow-ups with optional filters
 *
 * Query params:
 * - status: comma-separated list of statuses (confirmed, completed, dismissed)
 * - activityType: comma-separated list of activity types
 * - sortBy: dueDate | createdAt | title (default: dueDate)
 * - sortOrder: asc | desc (default: asc for dueDate, desc for createdAt)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const statusParam = searchParams.get("status");
    const activityTypeParam = searchParams.get("activityType");
    const sortBy = searchParams.get("sortBy") || "dueDate";
    const sortOrder = searchParams.get("sortOrder") || (sortBy === "createdAt" ? "desc" : "asc");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Prisma.UpdateFollowUpWhereInput = {
      userId: user.id,
    };

    // Filter by status (default to "confirmed" if no status filter)
    if (statusParam) {
      const statuses = statusParam.split(",").filter(Boolean);
      if (statuses.length > 0) {
        where.status = { in: statuses };
      }
    } else {
      where.status = "confirmed";
    }

    // Filter by activity type
    if (activityTypeParam) {
      const activityTypes = activityTypeParam.split(",").filter(Boolean);
      if (activityTypes.length > 0) {
        where.extractedActivity = {
          activityType: { in: activityTypes },
        };
      }
    }

    // Build order by
    const orderBy: Prisma.UpdateFollowUpOrderByWithRelationInput[] = [];
    if (sortBy === "dueDate") {
      orderBy.push({ dueDate: sortOrder as "asc" | "desc" });
      orderBy.push({ createdAt: "desc" }); // Secondary sort
    } else if (sortBy === "createdAt") {
      orderBy.push({ createdAt: sortOrder as "asc" | "desc" });
    } else if (sortBy === "title") {
      orderBy.push({ title: sortOrder as "asc" | "desc" });
    }

    // Get total count for pagination
    const totalCount = await prisma.updateFollowUp.count({ where });

    // Fetch follow-ups
    const followUps = await prisma.updateFollowUp.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        chatSession: {
          select: {
            id: true,
            sessionId: true,
            periodDate: true,
          },
        },
        extractedActivity: {
          select: {
            id: true,
            activityType: true,
            summary: true,
            quantity: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      followUps: followUps.map((fu) => ({
        id: fu.id,
        title: fu.title,
        summary: fu.summary,
        status: fu.status,
        activityType: fu.activityType,
        dueDate: fu.dueDate?.toISOString() || null,
        completedAt: fu.completedAt?.toISOString() || null,
        createdAt: fu.createdAt.toISOString(),
        chatSession: {
          id: fu.chatSession.id,
          sessionId: fu.chatSession.sessionId,
          periodDate: fu.chatSession.periodDate.toISOString(),
        },
        extractedActivity: {
          id: fu.extractedActivity.id,
          activityType: fu.extractedActivity.activityType,
          summary: fu.extractedActivity.summary,
          quantity: fu.extractedActivity.quantity,
        },
        team: fu.team ? { id: fu.team.id, name: fu.team.name } : null,
      })),
      count: followUps.length,
      totalCount,
      hasMore: offset + followUps.length < totalCount,
    });
  } catch (error) {
    return handleApiError(error, "updates/follow-ups:GET");
  }
}

const patchSchema = z.object({
  followUpId: z.string().optional(),
  followUpIds: z.array(z.string()).optional(),
  status: z.enum(["confirmed", "completed", "dismissed"]),
  completedInSessionId: z.string().optional(),
  dueDate: z.string().optional(), // ISO date string for updating due date
}).refine(data => data.followUpId || (data.followUpIds && data.followUpIds.length > 0), {
  message: "Either followUpId or followUpIds is required",
});

/**
 * PATCH /api/updates/follow-ups - Update follow-up status (complete, dismiss, or reopen)
 * Supports single or bulk updates
 */
export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = patchSchema.parse(body);

    // Get list of IDs to update
    const ids = validated.followUpIds || (validated.followUpId ? [validated.followUpId] : []);

    // Verify all follow-ups belong to user
    const followUps = await prisma.updateFollowUp.findMany({
      where: { id: { in: ids } },
    });

    if (followUps.length !== ids.length) {
      return apiError("One or more follow-ups not found", ErrorCode.NOT_FOUND, 404);
    }

    const unauthorized = followUps.find(fu => fu.userId !== user.id);
    if (unauthorized) {
      return apiError("Unauthorized", ErrorCode.FORBIDDEN, 403);
    }

    // Build update data
    const updateData: Prisma.UpdateFollowUpUpdateInput = {
      status: validated.status,
    };

    if (validated.status === "completed") {
      updateData.completedAt = new Date();
      updateData.completedInSessionId = validated.completedInSessionId || null;
    } else if (validated.status === "confirmed") {
      // Reopening - clear completed fields
      updateData.completedAt = null;
      updateData.completedInSessionId = null;
    } else if (validated.status === "dismissed") {
      updateData.completedAt = null;
      updateData.completedInSessionId = null;
    }

    if (validated.dueDate !== undefined) {
      updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }

    // Update all follow-ups
    const result = await prisma.updateFollowUp.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    return handleApiError(error, "updates/follow-ups:PATCH");
  }
}
