import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, commonErrors } from "@/lib/api-error";

const updateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  blocked: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ userId: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const { userId } = await params;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const [updated] = await db
      .update(users)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        blocked: users.blocked,
      });

    if (!updated) return commonErrors.notFound("User");
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, "admin/users/[userId]:PUT");
  }
}
