import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  networkingGroupMembers,
  networkingMindMapNodes,
} from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, commonErrors } from "@/lib/api-error";
import { broadcastToGroup } from "@/lib/pubsub";

const updateNodeSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

/**
 * PATCH /api/networking/groups/[groupId]/mindmap/[nodeId] - Update node position/label
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; nodeId: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { groupId, nodeId } = await params;

  try {
    // Verify membership
    const membership = await db.query.networkingGroupMembers.findFirst({
      where: and(
        eq(networkingGroupMembers.groupId, groupId),
        eq(networkingGroupMembers.userId, user.id)
      ),
    });
    if (!membership) return commonErrors.forbidden();

    const node = await db.query.networkingMindMapNodes.findFirst({
      where: and(
        eq(networkingMindMapNodes.id, nodeId),
        eq(networkingMindMapNodes.groupId, groupId)
      ),
    });
    if (!node) return commonErrors.notFound("Mind map node");

    const body = await request.json();
    const validated = updateNodeSchema.parse(body);

    const [updated] = await db
      .update(networkingMindMapNodes)
      .set(validated)
      .where(eq(networkingMindMapNodes.id, nodeId))
      .returning();

    await broadcastToGroup(groupId, { type: "mindmap:node:update", data: updated });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, "networking/groups/[groupId]/mindmap/[nodeId]:PATCH");
  }
}

/**
 * DELETE /api/networking/groups/[groupId]/mindmap/[nodeId] - Delete node
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; nodeId: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { groupId, nodeId } = await params;

  try {
    // Verify membership
    const membership = await db.query.networkingGroupMembers.findFirst({
      where: and(
        eq(networkingGroupMembers.groupId, groupId),
        eq(networkingGroupMembers.userId, user.id)
      ),
    });
    if (!membership) return commonErrors.forbidden();

    const node = await db.query.networkingMindMapNodes.findFirst({
      where: and(
        eq(networkingMindMapNodes.id, nodeId),
        eq(networkingMindMapNodes.groupId, groupId)
      ),
    });
    if (!node) return commonErrors.notFound("Mind map node");

    // Delete node and reassign children to parent
    await db
      .update(networkingMindMapNodes)
      .set({ parentId: node.parentId })
      .where(
        and(
          eq(networkingMindMapNodes.parentId, nodeId),
          eq(networkingMindMapNodes.groupId, groupId)
        )
      );

    await db
      .delete(networkingMindMapNodes)
      .where(eq(networkingMindMapNodes.id, nodeId));

    await broadcastToGroup(groupId, { type: "mindmap:node:delete", data: { id: nodeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "networking/groups/[groupId]/mindmap/[nodeId]:DELETE");
  }
}
