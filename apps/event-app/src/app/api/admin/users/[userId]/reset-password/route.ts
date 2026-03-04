import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts } from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, commonErrors } from "@/lib/api-error";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

type RouteParams = { params: Promise<{ userId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const { userId } = await params;

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true },
    });

    if (!dbUser) return commonErrors.notFound("User");

    const body = await request.json();
    const validated = resetPasswordSchema.parse(body);

    // Hash the password using better-auth's password hashing
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(validated.newPassword);

    // Update the credential account's password directly
    await db
      .update(accounts)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.providerId, "credential")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "admin/users/[userId]/reset-password:POST");
  }
}
