"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BoardSummary = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type BoardGridProps = {
  initialBoards: BoardSummary[];
};

type BoardPayload = {
  title: string;
  description?: string | null;
};

export function BoardGrid({ initialBoards }: BoardGridProps) {
  const router = useRouter();
  const [boards, setBoards] = useState(initialBoards);
  const [isCreating, setIsCreating] = useState(false);
  const [createPayload, setCreatePayload] = useState<BoardPayload>({ title: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filteredBoards = useMemo(() => {
    if (!search) return boards;
    return boards.filter((board) => board.title.toLowerCase().includes(search.toLowerCase()));
  }, [boards, search]);

  async function handleCreateBoard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!createPayload.title.trim()) {
      setError("Please provide a board name.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const board: BoardSummary = await response.json();
        setBoards((prev) => [board, ...prev]);
        setCreatePayload({ title: "", description: "" });
        setIsCreating(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  async function handleDeleteBoard(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/boards/${id}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        setBoards((prev) => prev.filter((board) => board.id !== id));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete board.");
      }
    });
  }

  function handleUpdateBoard(id: string, payload: BoardPayload) {
    setError(null);
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/boards/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const updated = await response.json();
          setBoards((prev) => prev.map((board) => (board.id === id ? { ...board, ...updated } : board)));
          router.refresh();
          resolve();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to update board.";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Your boards</h1>
          <p className="text-sm text-muted-foreground">Spin up dedicated workspaces for sprints, releases, or teams.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            placeholder="Search boards"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-60"
          />
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New board
          </Button>
        </div>
      </div>

      {error ? <p className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredBoards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onDelete={() => handleDeleteBoard(board.id)}
            onUpdate={(payload) => handleUpdateBoard(board.id, payload)}
          />
        ))}

        {!filteredBoards.length && boards.length ? (
          <div className="col-span-full rounded-xl border border-dashed border-border/80 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            No boards match “{search}”. Try a different keyword.
          </div>
        ) : null}
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new board</DialogTitle>
            <DialogDescription>
              Group related work into a collaborative space. You can invite teammates once your board is ready.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBoard} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Board name</label>
              <Input
                autoFocus
                required
                value={createPayload.title}
                onChange={(event) => setCreatePayload((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Product launch roadmap"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={createPayload.description ?? ""}
                onChange={(event) => setCreatePayload((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Define the goal of this board for your team."
                rows={4}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create board"}
              </Button>
            </div>
          </form>
        </DialogContent>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
      </Dialog>
    </div>
  );
}

function BoardCard({
  board,
  onDelete,
  onUpdate,
}: {
  board: BoardSummary;
  onDelete: () => void;
  onUpdate: (payload: BoardPayload) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [payload, setPayload] = useState<BoardPayload>({ title: board.title, description: board.description ?? "" });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      await onUpdate(payload);
      setIsEditing(false);
    });
  };

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-xl border border-border/60 bg-card/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute right-4 top-4">
        <BoardActions
          onEdit={() => setIsEditing(true)}
          onDelete={() => {
            if (confirm("This will permanently delete the board and all tasks. Continue?")) {
              onDelete();
            }
          }}
        />
      </div>
      <div className="space-y-3">
        <Link href={`/board/${board.id}`} className="block space-y-3">
          <h2 className="text-xl font-semibold leading-7 text-foreground transition group-hover:text-primary">
            {board.title}
          </h2>
          {board.description ? <p className="line-clamp-3 text-sm text-muted-foreground">{board.description}</p> : null}
        </Link>
      </div>
      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}</span>
        <Link href={`/board/${board.id}`} className="text-primary hover:underline">
          Open board
        </Link>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename “{board.title}”</DialogTitle>
            <DialogDescription>Give your board a clear, recognizable name and description.</DialogDescription>
          </DialogHeader>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Board name</label>
              <Input
                value={payload.title}
                onChange={(event) => setPayload((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={payload.description ?? ""}
                onChange={(event) => setPayload((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
      </Dialog>
    </div>
  );
}

function BoardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          className="z-50 min-w-[180px] rounded-lg border border-border/70 bg-popover p-1 text-sm shadow-lg"
        >
          <DropdownMenu.Item
            onSelect={(event) => {
              event.preventDefault();
              onEdit();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-foreground outline-none transition hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(event) => {
              event.preventDefault();
              onDelete();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-destructive outline-none transition hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
