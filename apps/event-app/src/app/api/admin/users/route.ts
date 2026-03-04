import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        blocked: users.blocked,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        twoFactorEnabled: users.twoFactorEnabled,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (error) {
    return handleApiError(error, "admin/users:GET");
  }
}
