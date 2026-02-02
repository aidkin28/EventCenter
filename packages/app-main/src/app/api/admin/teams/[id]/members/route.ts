import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth, Role } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";
import { sendTeamAddedEmail } from "@common/server/emails/sendTeamAddedEmail";
import { isTeamOwner, isTeamManager } from "@/lib/team-authorization";

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(["member", "admin"]).default("member"),
});

const removeMemberSchema = z.object({
  userId: z.string(),
});

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["member", "admin", "owner"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/teams/[id]/members - Add existing user to team
 */
export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;
  const { user: adminUser } = authResult;

  const { id: teamId } = await params;

  try {
    const body = await request.json();
    const validated = addMemberSchema.parse(body);

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return apiError("Team not found", ErrorCode.NOT_FOUND, 404);
    }

    // Verify user exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, email: true, name: true },
    });

    if (!userToAdd) {
      return apiError("User not found", ErrorCode.NOT_FOUND, 404);
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: validated.userId,
        },
      },
    });

    if (existingMember) {
      return apiError("User is already a member of this team", ErrorCode.VALIDATION_ERROR, 409);
    }

    // Add member
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: validated.userId,
        role: validated.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Send notification email
    try {
      await sendTeamAddedEmail(
        userToAdd.email,
        userToAdd.name,
        team.name,
        adminUser.name
      );
    } catch (emailError) {
      console.error("Failed to send team added email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]/members:POST");
  }
}

/**
 * DELETE /api/admin/teams/[id]/members - Remove member from team
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;

  const { id: teamId } = await params;

  try {
    const body = await request.json();
    const validated = removeMemberSchema.parse(body);

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return apiError("Team not found", ErrorCode.NOT_FOUND, 404);
    }

    // Check if member exists
    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: validated.userId,
        },
      },
    });

    if (!member) {
      return apiError("Member not found", ErrorCode.NOT_FOUND, 404);
    }

    // Prevent removing the owner
    if (member.role === "owner") {
      return apiError("Cannot remove the team owner", ErrorCode.FORBIDDEN, 403);
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: validated.userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]/members:DELETE");
  }
}

/**
 * PATCH /api/admin/teams/[id]/members - Update member role
 * Only team owners can change roles. System admins can also change roles.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user: currentUser } = authResult;

  const { id: teamId } = await params;

  try {
    const body = await request.json();
    const validated = updateRoleSchema.parse(body);

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return apiError("Team not found", ErrorCode.NOT_FOUND, 404);
    }

    // Check authorization - must be team owner or system admin
    const isOwner = await isTeamOwner(teamId, currentUser.id);
    const isSystemAdmin = currentUser.role === "admin";

    if (!isOwner && !isSystemAdmin) {
      return apiError(
        "Only team owners can change member roles",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    // Get the member to update
    const memberToUpdate = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: validated.userId,
        },
      },
    });

    if (!memberToUpdate) {
      return apiError("Member not found", ErrorCode.NOT_FOUND, 404);
    }

    // Handle ownership transfer
    if (validated.role === "owner") {
      // Only current owner can transfer ownership
      if (!isOwner && !isSystemAdmin) {
        return apiError(
          "Only the current owner can transfer ownership",
          ErrorCode.FORBIDDEN,
          403
        );
      }

      // Transfer ownership in a transaction
      await prisma.$transaction([
        // Demote current owner to admin
        prisma.teamMember.updateMany({
          where: { teamId, role: "owner" },
          data: { role: "admin" },
        }),
        // Promote new owner
        prisma.teamMember.update({
          where: {
            teamId_userId: {
              teamId,
              userId: validated.userId,
            },
          },
          data: { role: "owner" },
        }),
      ]);
    } else {
      // Prevent demoting the owner without transferring ownership
      if (memberToUpdate.role === "owner") {
        return apiError(
          "Cannot demote the owner. Transfer ownership first.",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }

      // Update role
      await prisma.teamMember.update({
        where: {
          teamId_userId: {
            teamId,
            userId: validated.userId,
          },
        },
        data: { role: validated.role },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]/members:PATCH");
  }
}
