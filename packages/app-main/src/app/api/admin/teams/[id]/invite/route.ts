import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth, Role } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";
import { sendTeamInvitationEmail } from "@common/server/emails/sendTeamInvitationEmail";
import { randomBytes } from "crypto";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/teams/[id]/invite - Invite a new user to team by email
 */
export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;
  const { user: adminUser } = authResult;

  const { id: teamId } = await params;

  try {
    const body = await request.json();
    const validated = inviteSchema.parse(body);
    const email = validated.email.toLowerCase();

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return apiError("Team not found", ErrorCode.NOT_FOUND, 404);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if already a member
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return apiError(
          "This user is already a member of the team",
          ErrorCode.VALIDATION_ERROR,
          409
        );
      }

      // Add them directly instead of inviting
      await prisma.teamMember.create({
        data: {
          teamId,
          userId: existingUser.id,
          role: "member",
        },
      });

      return NextResponse.json({
        message: "User added to team (already registered)",
        addedDirectly: true,
      });
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        email,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return apiError(
        "An invitation has already been sent to this email",
        ErrorCode.VALIDATION_ERROR,
        409
      );
    }

    // Generate invitation token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    // Create invitation
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        invitedById: adminUser.id,
        token,
        expiresAt,
      },
    });

    // Send invitation email
    try {
      await sendTeamInvitationEmail(
        email,
        team.name,
        adminUser.name,
        token
      );
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Delete the invitation if email fails
      await prisma.teamInvitation.delete({
        where: { id: invitation.id },
      });
      return apiError(
        "Failed to send invitation email",
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        502
      );
    }

    return NextResponse.json(
      {
        message: "Invitation sent",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]/invite:POST");
  }
}

/**
 * DELETE /api/admin/teams/[id]/invite - Cancel a pending invitation
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;

  const { id: teamId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return apiError("Invitation ID required", ErrorCode.BAD_REQUEST, 400);
    }

    const invitation = await prisma.teamInvitation.findFirst({
      where: {
        id: invitationId,
        teamId,
      },
    });

    if (!invitation) {
      return apiError("Invitation not found", ErrorCode.NOT_FOUND, 404);
    }

    await prisma.teamInvitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]/invite:DELETE");
  }
}
