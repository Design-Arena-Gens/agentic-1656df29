import { redirect } from "next/navigation";

import { BoardGrid } from "@/components/boards/board-grid";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const session = await requireAuth();
  const { userId } = session;

  if (!userId) {
    redirect("/sign-in");
  }

  const boards = await prisma.board.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  });

  const payload = boards.map((board) => ({
    id: board.id,
    title: board.title,
    description: board.description,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  }));

  return <BoardGrid initialBoards={payload} />;
}
