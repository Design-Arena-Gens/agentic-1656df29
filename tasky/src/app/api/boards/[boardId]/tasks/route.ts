import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createTaskSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(2000).optional().nullable(),
  columnId: z.string().cuid(),
  dueDate: z.string().datetime().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;

  try {
    const session = await requireAuth();
    const payload = createTaskSchema.parse(await request.json());

    const column = await prisma.column.findUnique({
      where: { id: payload.columnId },
      include: { board: { select: { ownerId: true, id: true } } },
    });

    if (!column || column.board.id !== boardId || column.board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const position = await prisma.task.count({
      where: { columnId: payload.columnId },
    });

    const task = await prisma.task.create({
      data: {
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        position,
        columnId: payload.columnId,
        boardId,
      },
      include: {
        comments: true,
      },
    });

    revalidatePath(`/board/${boardId}`);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
