import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;

  try {
    const session = await requireAuth();

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: { select: { id: true } },
        task: { select: { boardId: true, board: { select: { ownerId: true } } } },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.author.id !== session.userId && comment.task.board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    revalidatePath(`/board/${comment.task.boardId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
