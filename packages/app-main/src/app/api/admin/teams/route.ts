import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth, Role } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

const createTeamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  description: z.string().optional(),
});

/**
 * GET /api/admin/teams - List all teams (admin only)
 */
export async function GET() {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;

  try {
    const teams = await prisma.team.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true, invitations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    return handleApiError(error, "admin/teams:GET");
  }
}

/**
 * POST /api/admin/teams - Create a new team (admin only)
 */
export async function POST(request: Request) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = createTeamSchema.parse(body);

    const team = await prisma.team.create({
      data: {
        name: validated.name,
        description: validated.description,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Auto-add creator as owner
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: "owner",
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return handleApiError(error, "admin/teams:POST");
  }
}
