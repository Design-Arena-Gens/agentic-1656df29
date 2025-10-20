import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateBoardSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  try {
    const session = await requireAuth();
    const board = await prisma.board.findUnique({
      where: { id: boardId, ownerId: session.userId! },
      include: {
        columns: { orderBy: { position: "asc" } },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;

  try {
    const session = await requireAuth();
    const payload = updateBoardSchema.parse(await request.json());

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });

    if (!board || board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const updated = await prisma.board.update({
      where: { id: boardId },
      data: {
        title: payload.title,
        description: payload.description,
        isArchived: payload.isArchived,
      },
    });

    revalidatePath("/boards");
    revalidatePath(`/board/${boardId}`);

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      isArchived: updated.isArchived,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;

  try {
    const session = await requireAuth();

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });

    if (!board || board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    await prisma.board.delete({
      where: { id: boardId },
    });

    revalidatePath("/boards");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}
