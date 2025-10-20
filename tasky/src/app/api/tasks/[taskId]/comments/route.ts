import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;

  try {
    const session = await requireAuth();
    const payload = commentSchema.parse(await request.json());

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { board: { select: { ownerId: true, id: true } } },
    });

    if (!task || task.board.ownerId !== session.userId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: payload.content,
        taskId,
        authorId: session.userId!,
      },
      include: {
        author: true,
      },
    });

    revalidatePath(`/board/${task.boardId}`);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
