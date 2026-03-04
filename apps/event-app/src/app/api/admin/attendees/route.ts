import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendees } from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";
import { createId } from "@/lib/utils";

const createAttendeeSchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().max(255).optional(),
  imageUrl: z.string().optional(),
  initials: z.string().max(10).optional(),
  userId: z.string().optional(),
});

export async function GET() {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const allAttendees = await db
      .select()
      .from(attendees)
      .orderBy(desc(attendees.createdAt));

    return NextResponse.json(allAttendees);
  } catch (error) {
    return handleApiError(error, "admin/attendees:GET");
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const validated = createAttendeeSchema.parse(body);

    const [attendee] = await db
      .insert(attendees)
      .values({
        id: createId(),
        name: validated.name,
        title: validated.title ?? null,
        imageUrl: validated.imageUrl ?? null,
        initials: validated.initials ?? null,
        userId: validated.userId ?? null,
      })
      .returning();

    return NextResponse.json(attendee, { status: 201 });
  } catch (error) {
    return handleApiError(error, "admin/attendees:POST");
  }
}
