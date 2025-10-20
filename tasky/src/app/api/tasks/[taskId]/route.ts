import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  columnId: z.string().cuid().optional(),
  position: z.number().int().min(0).optional(),
  assigneeId: z.string().optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;

  try {
    const session = await requireAuth();
    const payload = updateTaskSchema.parse(await request.json());

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: { select: { ownerId: true, id: true } },
      },
    });

    if (!task || task.board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (payload.columnId && payload.columnId !== task.columnId) {
      const column = await prisma.column.findUnique({
        where: { id: payload.columnId },
        select: { boardId: true },
      });

      if (!column || column.boardId !== task.boardId) {
        return NextResponse.json({ error: "Invalid column" }, { status: 400 });
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        columnId: payload.columnId,
        position: payload.position,
        assigneeId: payload.assigneeId,
      },
      include: {
        comments: true,
      },
    });

    revalidatePath(`/board/${task.boardId}`);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;

  try {
    const session = await requireAuth();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        boardId: true,
        board: { select: { ownerId: true } },
      },
    });

    if (!task || task.board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: taskId } });

    revalidatePath(`/board/${task.boardId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
