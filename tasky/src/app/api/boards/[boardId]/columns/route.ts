import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createColumnSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;

  try {
    const session = await requireAuth();
    const payload = createColumnSchema.parse(await request.json());

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });

    if (!board || board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const columnCount = await prisma.column.count({ where: { boardId } });

    const column = await prisma.column.create({
      data: {
        name: payload.name,
        position: columnCount,
        boardId,
      },
    });

    revalidatePath(`/board/${boardId}`);

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to create column" }, { status: 500 });
  }
}
