import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

/**
 * GET /api/updates/todos - Get user's todos
 * Query params: status (optional) - "pending", "completed", or "all"
 */
export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const whereClause: { userId: string; status?: string } = {
      userId: user.id,
    };

    if (status !== "all") {
      whereClause.status = status;
    }

    const todos = await prisma.userTodo.findMany({
      where: whereClause,
      orderBy: [
        { status: "asc" }, // pending first
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      todos: todos.map((todo) => ({
        id: todo.id,
        content: todo.content,
        status: todo.status,
        completedAt: todo.completedAt?.toISOString() || null,
        createdAt: todo.createdAt.toISOString(),
      })),
      count: todos.length,
    });
  } catch (error) {
    return handleApiError(error, "updates/todos:GET");
  }
}

const createSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000),
});

/**
 * POST /api/updates/todos - Create a new todo
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = createSchema.parse(body);

    // Get the highest sortOrder for this user
    const maxOrder = await prisma.userTodo.findFirst({
      where: { userId: user.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const todo = await prisma.userTodo.create({
      data: {
        userId: user.id,
        content: validated.content,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      todo: {
        id: todo.id,
        content: todo.content,
        status: todo.status,
        completedAt: null,
        createdAt: todo.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, "updates/todos:POST");
  }
}

const patchSchema = z.object({
  todoId: z.string(),
  content: z.string().min(1).max(2000).optional(),
  status: z.enum(["pending", "completed"]).optional(),
});

/**
 * PATCH /api/updates/todos - Update a todo (content or status)
 */
export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const validated = patchSchema.parse(body);

    // Verify todo belongs to user
    const todo = await prisma.userTodo.findUnique({
      where: { id: validated.todoId },
    });

    if (!todo) {
      return apiError("Todo not found", ErrorCode.NOT_FOUND, 404);
    }

    if (todo.userId !== user.id) {
      return apiError("Unauthorized", ErrorCode.FORBIDDEN, 403);
    }

    // Build update data
    const updateData: {
      content?: string;
      status?: string;
      completedAt?: Date | null;
    } = {};

    if (validated.content !== undefined) {
      updateData.content = validated.content;
    }

    if (validated.status !== undefined) {
      updateData.status = validated.status;
      updateData.completedAt = validated.status === "completed" ? new Date() : null;
    }

    const updated = await prisma.userTodo.update({
      where: { id: validated.todoId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      todo: {
        id: updated.id,
        content: updated.content,
        status: updated.status,
        completedAt: updated.completedAt?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, "updates/todos:PATCH");
  }
}

const deleteSchema = z.object({
  todoId: z.string(),
});

/**
 * DELETE /api/updates/todos - Delete a todo
 */
export async function DELETE(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const todoId = searchParams.get("todoId");

    if (!todoId) {
      return apiError("Todo ID required", ErrorCode.BAD_REQUEST, 400);
    }

    // Verify todo belongs to user
    const todo = await prisma.userTodo.findUnique({
      where: { id: todoId },
    });

    if (!todo) {
      return apiError("Todo not found", ErrorCode.NOT_FOUND, 404);
    }

    if (todo.userId !== user.id) {
      return apiError("Unauthorized", ErrorCode.FORBIDDEN, 403);
    }

    await prisma.userTodo.delete({
      where: { id: todoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "updates/todos:DELETE");
  }
}
