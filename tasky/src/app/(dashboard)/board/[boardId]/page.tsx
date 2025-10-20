import { notFound } from "next/navigation";

import { BoardKanban } from "@/components/board/board-kanban";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface BoardPageProps {
  params: Promise<{
    boardId: string;
  }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;
  const session = await requireAuth();

  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: session.userId! },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              comments: {
                orderBy: { createdAt: "asc" },
                include: { author: true },
              },
            },
          },
        },
      },
    },
  });

  if (!board) {
    notFound();
  }

  const payload = {
    id: board.id,
    title: board.title,
    description: board.description,
    isArchived: board.isArchived,
    columns: board.columns.map((column) => ({
      id: column.id,
      name: column.name,
      position: column.position,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
      tasks: column.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        position: task.position,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        assigneeId: task.assigneeId,
        columnId: column.id,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        comments: task.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          authorId: comment.authorId,
          author: {
            id: comment.author.id,
            firstName: comment.author.firstName,
            lastName: comment.author.lastName,
            imageUrl: comment.author.imageUrl,
          },
          createdAt: comment.createdAt.toISOString(),
        })),
      })),
    })),
  };

  return <BoardKanban board={payload} />;
}
