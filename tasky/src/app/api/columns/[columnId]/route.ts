import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateColumnSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  position: z.number().int().min(0).optional(),
});

async function assertOwnership(columnId: string, userId: string) {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: { select: { ownerId: true, id: true } } },
  });

  if (!column || column.board.ownerId !== userId) {
    return null;
  }

  return column;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ columnId: string }> }) {
  const { columnId } = await params;

  try {
    const session = await requireAuth();
    const column = await assertOwnership(columnId, session.userId!);

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const payload = updateColumnSchema.parse(await request.json());

    const updated = await prisma.column.update({
      where: { id: columnId },
      data: {
        name: payload.name,
        position: payload.position,
      },
    });

    revalidatePath(`/board/${column.boardId}`);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to update column" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ columnId: string }> }) {
  const { columnId } = await params;

  try {
    const session = await requireAuth();
    const column = await assertOwnership(columnId, session.userId!);

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    await prisma.column.delete({ where: { id: columnId } });

    revalidatePath(`/board/${column.boardId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete column" }, { status: 500 });
  }
}
