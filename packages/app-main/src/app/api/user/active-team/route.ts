import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

const updateActiveTeamSchema = z.object({
  teamId: z.string().nullable(),
});

/**
 * GET /api/user/active-team - Get user's current active team
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        activeTeamId: true,
        activeTeam: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({
      activeTeamId: dbUser?.activeTeamId || null,
      activeTeam: dbUser?.activeTeam || null,
    });
  } catch (error) {
    return handleApiError(error, "user/active-team:GET");
  }
}

/**
 * PATCH /api/user/active-team - Update user's active team
 */
export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = updateActiveTeamSchema.parse(body);

    // If setting a team, verify user is a member
    if (validated.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: validated.teamId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return apiError(
          "You are not a member of this team",
          ErrorCode.FORBIDDEN,
          403
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { activeTeamId: validated.teamId },
      select: {
        activeTeamId: true,
        activeTeam: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({
      activeTeamId: updated.activeTeamId,
      activeTeam: updated.activeTeam,
    });
  } catch (error) {
    return handleApiError(error, "user/active-team:PATCH");
  }
}
