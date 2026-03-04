import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";
import { createId } from "@/lib/utils";

const createEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  venue: z.string().max(500).optional(),
  location: z.string().max(500).optional(),
});

export async function GET() {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const allEvents = await db
      .select()
      .from(events)
      .orderBy(desc(events.startDate));

    return NextResponse.json(allEvents);
  } catch (error) {
    return handleApiError(error, "admin/events:GET");
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const validated = createEventSchema.parse(body);

    const [event] = await db
      .insert(events)
      .values({
        id: createId(),
        title: validated.title,
        description: validated.description ?? null,
        startDate: validated.startDate,
        endDate: validated.endDate,
        venue: validated.venue ?? null,
        location: validated.location ?? null,
      })
      .returning();

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleApiError(error, "admin/events:POST");
  }
}
