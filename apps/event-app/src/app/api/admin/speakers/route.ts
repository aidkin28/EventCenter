import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { speakers } from "@/db/schema";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";
import { createId } from "@/lib/utils";

const createSpeakerSchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  company: z.string().max(255).optional(),
  bio: z.string().min(1),
  imageUrl: z.string().optional(),
  initials: z.string().min(1).max(10),
  userId: z.string().optional(),
});

export async function GET() {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const allSpeakers = await db
      .select()
      .from(speakers)
      .orderBy(desc(speakers.createdAt));

    return NextResponse.json(allSpeakers);
  } catch (error) {
    return handleApiError(error, "admin/speakers:GET");
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth({ permissions: { role: "admin" } });
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const validated = createSpeakerSchema.parse(body);

    const [speaker] = await db
      .insert(speakers)
      .values({
        id: createId(),
        name: validated.name,
        title: validated.title,
        company: validated.company ?? "Scotiabank",
        bio: validated.bio,
        imageUrl: validated.imageUrl ?? "",
        initials: validated.initials,
        userId: validated.userId ?? null,
      })
      .returning();

    return NextResponse.json(speaker, { status: 201 });
  } catch (error) {
    return handleApiError(error, "admin/speakers:POST");
  }
}
