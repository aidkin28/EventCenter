import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { networkingGroupMembers } from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";
import { generateClientUrl } from "@/lib/pubsub";

/**
 * GET /api/networking/pubsub/negotiate - Get PubSub client access URL
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const memberships = await db.query.networkingGroupMembers.findMany({
      where: eq(networkingGroupMembers.userId, user.id),
      columns: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);
    const url = await generateClientUrl(user.id, groupIds);

    if (!url) {
      return NextResponse.json(
        { error: "PubSub not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    return handleApiError(error, "networking/pubsub/negotiate:GET");
  }
}
