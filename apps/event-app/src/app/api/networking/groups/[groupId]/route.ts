import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  networkingGroups,
  networkingGroupMembers,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, commonErrors } from "@/lib/api-error";

/**
 * GET /api/networking/groups/[groupId] - Get group detail
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { groupId } = await params;

  try {
    const [group] = await db
      .select({
        id: networkingGroups.id,
        name: networkingGroups.name,
        description: networkingGroups.description,
        creatorId: networkingGroups.creatorId,
        creatorName: users.name,
        topWords: networkingGroups.topWords,
        memberCount: networkingGroups.memberCount,
        createdAt: networkingGroups.createdAt,
      })
      .from(networkingGroups)
      .leftJoin(users, eq(networkingGroups.creatorId, users.id))
      .where(eq(networkingGroups.id, groupId));

    if (!group) return commonErrors.notFound("Group");

    // Check membership
    const membership = await db.query.networkingGroupMembers.findFirst({
      where: and(
        eq(networkingGroupMembers.groupId, groupId),
        eq(networkingGroupMembers.userId, user.id)
      ),
    });

    return NextResponse.json({
      ...group,
      isMember: !!membership,
    });
  } catch (error) {
    return handleApiError(error, "networking/groups/[groupId]:GET");
  }
}

/**
 * DELETE /api/networking/groups/[groupId] - Delete group (creator only)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { groupId } = await params;

  try {
    const group = await db.query.networkingGroups.findFirst({
      where: eq(networkingGroups.id, groupId),
    });

    if (!group) return commonErrors.notFound("Group");
    if (group.creatorId !== user.id) return commonErrors.forbidden();

    await db.delete(networkingGroups).where(eq(networkingGroups.id, groupId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "networking/groups/[groupId]:DELETE");
  }
}
