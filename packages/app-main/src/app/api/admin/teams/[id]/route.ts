import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth, Role } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

const updateTeamSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/teams/[id] - Get team details
 */
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;

  const { id } = await params;

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        invitations: {
          where: { status: "pending" },
          include: {
            invitedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!team) {
      return apiError("Team not found", ErrorCode.NOT_FOUND, 404);
    }

    return NextResponse.json(team);
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]:GET");
  }
}

/**
 * PATCH /api/admin/teams/[id] - Update team
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = updateTeamSchema.parse(body);

    const team = await prisma.team.update({
      where: { id },
      data: validated,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]:PATCH");
  }
}

/**
 * DELETE /api/admin/teams/[id] - Delete team
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;

  const { id } = await params;

  try {
    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]:DELETE");
  }
}
