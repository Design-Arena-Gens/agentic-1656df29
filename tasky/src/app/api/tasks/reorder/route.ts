import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reorderSchema = z.object({
  boardId: z.string().cuid(),
  tasks: z
    .array(
      z.object({
        id: z.string().cuid(),
        columnId: z.string().cuid(),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const payload = reorderSchema.parse(await request.json());

    const board = await prisma.board.findUnique({
      where: { id: payload.boardId },
      select: { ownerId: true },
    });

    if (!board || board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    await prisma.$transaction(
      payload.tasks.map((task) =>
        prisma.task.update({
          where: { id: task.id },
          data: { columnId: task.columnId, position: task.position },
        }),
      ),
    );

    revalidatePath(`/board/${payload.boardId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 });
  }
}
