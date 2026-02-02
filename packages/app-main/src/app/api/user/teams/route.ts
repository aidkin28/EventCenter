import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

/**
 * GET /api/user/teams - Get teams the current user is a member of
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      teams: memberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        description: m.team.description,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "user/teams:GET");
  }
}

/**
 * POST /api/user/teams - Create a new team (user becomes owner)
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = createTeamSchema.parse(body);

    // Create team and add user as owner in a transaction
    const team = await prisma.team.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "user/teams:POST");
  }
}
