import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";
import { generateClientUrl } from "@/lib/pubsub";

/**
 * GET /api/sessions/[sessionId]/chat/negotiate - PubSub client access URL
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { sessionId } = await params;

  try {
    const url = await generateClientUrl(user.id, [`session:${sessionId}`]);

    if (!url) {
      return NextResponse.json(
        { error: "PubSub not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    return handleApiError(error, "sessions/[sessionId]/chat/negotiate:GET");
  }
}
