import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createBoardSchema = z.object({
  title: z.string().min(3, "Board name must be at least 3 characters").max(120),
  description: z
    .string()
    .max(1000, "Description should be under 1000 characters")
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const payload = createBoardSchema.parse(await request.json());

    const board = await prisma.$transaction(async (tx) => {
      const createdBoard = await tx.board.create({
        data: {
          title: payload.title,
          description: payload.description,
          ownerId: session.userId!,
        },
      });

      const defaultColumns = ["Backlog", "In Progress", "Review", "Done"];
      await Promise.all(
        defaultColumns.map((name, index) =>
          tx.column.create({
            data: {
              name,
              position: index,
              boardId: createdBoard.id,
            },
          }),
        ),
      );

      return createdBoard;
    });

    revalidatePath("/boards");

    return NextResponse.json(
      {
        id: board.id,
        title: board.title,
        description: board.description,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await requireAuth();

    const boards = await prisma.board.findMany({
      where: { ownerId: session.userId! },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      boards.map((board) => ({
        id: board.id,
        title: board.title,
        description: board.description,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch boards" }, { status: 500 });
  }
}
