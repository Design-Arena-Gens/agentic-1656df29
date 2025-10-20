"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import {
  CalendarDays,
  ListChecks,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export type CommentState = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
};

export type TaskState = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  assigneeId: string | null;
  columnId: string;
  createdAt: string;
  updatedAt: string;
  comments: CommentState[];
};

export type ColumnState = {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  tasks: TaskState[];
};

export type BoardState = {
  id: string;
  title: string;
  description: string | null;
  isArchived: boolean;
  columns: ColumnState[];
};

type BoardKanbanProps = {
  board: BoardState;
};

type TaskDialogProps = {
  task: TaskState | null;
  onClose: () => void;
  onUpdate: (payload: Partial<Pick<TaskState, "title" | "description" | "dueDate">>) => Promise<void>;
  onDelete: () => Promise<void>;
  onCreateComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
};

export function BoardKanban({ board }: BoardKanbanProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<ColumnState[]>(() =>
    board.columns
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((column) => ({
        ...column,
        tasks: column.tasks
          .slice()
          .sort((taskA, taskB) => taskA.position - taskB.position)
          .map((task) => ({ ...task, columnId: column.id })),
      })),
  );
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState(board.title);
  const [boardDescription, setBoardDescription] = useState(board.description ?? "");
  const [selectedTask, setSelectedTask] = useState<TaskState | null>(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTask, setActiveTask] = useState<TaskState | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const filteredColumns = useMemo(() => {
    if (!search.trim()) {
      return columns;
    }

    const term = search.toLowerCase();
    return columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) =>
        [task.title, task.description ?? ""].some((value) => value?.toLowerCase().includes(term)),
      ),
    }));
  }, [columns, search]);

  function resetFeedback() {
    setFeedback(null);
    setError(null);
  }

  async function handleCreateColumn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    if (!columnName.trim()) {
      setError("Column name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/boards/${board.id}/columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: columnName }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const column: ColumnState = await response.json();
        const nextColumns: ColumnState[] = [
          ...columns,
          {
            ...column,
            tasks: [],
            createdAt: column.createdAt,
            updatedAt: column.updatedAt,
          },
        ]
          .map((col) => ({
            ...col,
            tasks: col.tasks.map((task) => ({ ...task, columnId: col.id })),
          }))
          .sort((a, b) => a.position - b.position);

        setColumns(nextColumns);
        setColumnDialogOpen(false);
        setColumnName("");
        setFeedback("Column created");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create column");
      }
    });
  }

  function updateColumnInState(columnId: string, updater: (column: ColumnState) => ColumnState) {
    setColumns((prev) => prev.map((column) => (column.id === columnId ? updater(column) : column)));
  }

  function removeColumnFromState(columnId: string) {
    setColumns((prev) => prev.filter((column) => column.id !== columnId));
  }

  async function handleRenameColumn(columnId: string, name: string) {
    resetFeedback();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/columns/${columnId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        updateColumnInState(columnId, (column) => ({ ...column, name }));
        setFeedback("Column renamed");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename column");
      }
    });
  }

  async function handleDeleteColumn(columnId: string) {
    resetFeedback();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/columns/${columnId}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        removeColumnFromState(columnId);
        setFeedback("Column removed");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete column");
      }
    });
  }

  function handleCreateTask(columnId: string, payload: { title: string; description?: string }) {
    resetFeedback();
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/boards/${board.id}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: payload.title,
              description: payload.description,
              columnId,
            }),
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const task: TaskState = await response.json();

          setColumns((prev) =>
            prev.map((column) =>
              column.id === columnId
                ? {
                    ...column,
                    tasks: [
                      ...column.tasks,
                      {
                        ...task,
                        columnId,
                        comments: task.comments ?? [],
                      },
                    ],
                  }
                : column,
            ),
          );

          setFeedback("Task captured");
          router.refresh();
          resolve();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to add task";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }

  function handleUpdateTask(taskId: string, payload: Partial<Pick<TaskState, "title" | "description" | "dueDate">>) {
    resetFeedback();
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              dueDate: payload.dueDate ?? null,
            }),
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          setColumns((prev) => {
            const next = prev.map((column) => ({
              ...column,
              tasks: column.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      ...payload,
                      dueDate: payload.dueDate ?? null,
                      updatedAt: new Date().toISOString(),
                    }
                  : task,
              ),
            }));

            if (selectedTask?.id === taskId) {
              const nextTask = next.flatMap((column) => column.tasks).find((task) => task.id === taskId);
              if (nextTask) {
                setSelectedTask(nextTask);
              }
            }

            return next;
          });

          setFeedback("Task updated");
          router.refresh();
          resolve();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unable to update task";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }

  function handleDeleteTask(taskId: string) {
    resetFeedback();
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
          if (!response.ok) {
            throw new Error(await response.text());
          }

          setColumns((prev) =>
            prev.map((column) => ({
              ...column,
              tasks: column.tasks.filter((task) => task.id !== taskId),
            })),
          );
          setSelectedTask(null);
          setFeedback("Task deleted");
          router.refresh();
          resolve();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to delete task";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }

  function handleCreateComment(taskId: string, content: string) {
    resetFeedback();
    if (!content.trim()) {
      const message = "Comment cannot be empty";
      setError(message);
      return Promise.reject(new Error(message));
    }

    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/tasks/${taskId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const comment: CommentState = await response.json();

          setColumns((prev) => {
            const next = prev.map((column) => ({
              ...column,
              tasks: column.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      comments: [...task.comments, comment],
                    }
                  : task,
              ),
            }));

            if (selectedTask?.id === taskId) {
              const nextTask = next.flatMap((column) => column.tasks).find((task) => task.id === taskId);
              if (nextTask) {
                setSelectedTask(nextTask);
              }
            }

            return next;
          });

          setFeedback("Comment added");
          router.refresh();
          resolve();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to add comment";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }

  function handleDeleteComment(taskId: string, commentId: string) {
    resetFeedback();
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
          if (!response.ok) {
            throw new Error(await response.text());
          }

          setColumns((prev) => {
            const next = prev.map((column) => ({
              ...column,
              tasks: column.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      comments: task.comments.filter((comment) => comment.id !== commentId),
                    }
                  : task,
              ),
            }));

            if (selectedTask?.id === taskId) {
              const nextTask = next.flatMap((column) => column.tasks).find((task) => task.id === taskId);
              if (nextTask) {
                setSelectedTask(nextTask);
              }
            }

            return next;
          });

          setFeedback("Comment removed");
          router.refresh();
          resolve();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to delete comment";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }

  async function persistColumnOrder(nextColumns: ColumnState[]) {
    await fetch(`/api/columns/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: board.id,
        columns: nextColumns.map((column, index) => ({ id: column.id, position: index })),
      }),
    });
  }

  async function persistTaskOrder(nextColumns: ColumnState[]) {
    await fetch(`/api/tasks/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: board.id,
        tasks: nextColumns.flatMap((column) =>
          column.tasks.map((task, index) => ({
            id: task.id,
            columnId: column.id,
            position: index,
          })),
        ),
      }),
    });
  }

  async function handleBoardUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/boards/${board.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: boardTitle,
            description: boardDescription,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        setBoardDialogOpen(false);
        setFeedback("Board updated");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update board");
      }
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type as string | undefined;
    if (type === "task") {
      const taskId = event.active.id as string;
      const column = columns.find((col) => col.tasks.some((task) => task.id === taskId));
      const task = column?.tasks.find((item) => item.id === taskId) ?? null;
      setActiveTask(task ?? null);
    } else if (type === "column") {
      const columnId = event.active.id as string;
      const column = columns.find((col) => col.id === columnId) ?? null;
      setActiveColumn(column);
    }
  }

  function normalizeColumnOrder(nextColumns: ColumnState[]): ColumnState[] {
    return nextColumns.map((column, index) => ({
      ...column,
      position: index,
      tasks: column.tasks.map((task, idx) => ({
        ...task,
        columnId: column.id,
        position: idx,
      })),
    }));
  }

  function resolveTargetColumn(over: DragEndEvent["over"]) {
    if (!over) return null;
    const type = over.data.current?.type;
    if (type === "task") {
      const taskColumn = columns.find((column) => column.tasks.some((task) => task.id === over.id));
      return taskColumn?.id ?? null;
    }
    if (type === "column-droppable") {
      return (over.data.current as { columnId: string }).columnId;
    }
    if (type === "column") {
      return over.id as string;
    }
    return null;
  }

  function resolveTargetIndex(over: DragEndEvent["over"], columnId: string) {
    if (!over) return 0;
    const type = over.data.current?.type;
    if (type === "task") {
      const column = columns.find((col) => col.id === columnId);
      if (!column) return 0;
      const taskIndex = column.tasks.findIndex((task) => task.id === over.id);
      return taskIndex === -1 ? column.tasks.length : taskIndex;
    }
    const column = columns.find((col) => col.id === columnId);
    return column ? column.tasks.length : 0;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);

    if (!over) {
      return;
    }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === "column" && overType === "column") {
      const activeIndex = columns.findIndex((column) => column.id === active.id);
      const overIndex = columns.findIndex((column) => column.id === over.id);

      if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
        const reordered = arrayMove(columns, activeIndex, overIndex);
        const normalized = normalizeColumnOrder(reordered);
        setColumns(normalized);
        startTransition(async () => {
          try {
            await persistColumnOrder(normalized);
            router.refresh();
          } catch (err) {
            console.error(err);
          }
        });
      }
      return;
    }

    if (activeType === "task") {
      const sourceColumn = columns.find((column) => column.tasks.some((task) => task.id === active.id));
      if (!sourceColumn) {
        return;
      }

      const sourceColumnIndex = columns.findIndex((column) => column.id === sourceColumn.id);
      const sourceTaskIndex = sourceColumn.tasks.findIndex((task) => task.id === active.id);

      const targetColumnId = resolveTargetColumn(over);
      if (!targetColumnId) {
        return;
      }

      const destinationColumnIndex = columns.findIndex((column) => column.id === targetColumnId);
      if (destinationColumnIndex === -1) {
        return;
      }

      let targetIndex = resolveTargetIndex(over, targetColumnId);
      if (sourceColumn.id === targetColumnId && sourceTaskIndex < targetIndex) {
        targetIndex -= 1;
      }
      if (targetIndex < 0) {
        targetIndex = 0;
      }

      const nextColumns = columns.map((column) => ({ ...column, tasks: column.tasks.map((task) => ({ ...task })) }));
      const [movingTask] = nextColumns[sourceColumnIndex].tasks.splice(sourceTaskIndex, 1);
      nextColumns[destinationColumnIndex].tasks.splice(targetIndex, 0, {
        ...movingTask,
        columnId: targetColumnId,
      });

      const normalized = normalizeColumnOrder(nextColumns);
      setColumns(normalized);

      startTransition(async () => {
        try {
          await persistTaskOrder(normalized);
          router.refresh();
        } catch (err) {
          console.error(err);
        }
      });
    }
  }

  const totalTasks = columns.reduce((acc, column) => acc + column.tasks.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <ListChecks className="h-4 w-4" />
              {totalTasks ? "Active board" : "Empty board"}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-foreground">{board.title}</h1>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {columns.length} columns · {totalTasks} tasks
              </span>
            </div>
            {board.description ? <p className="max-w-2xl text-sm text-muted-foreground">{board.description}</p> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search tasks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="sm:w-64"
            />
            <Button variant="secondary" onClick={() => setBoardDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Board settings
            </Button>
            <Button onClick={() => setColumnDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add column
            </Button>
          </div>
        </div>
        {feedback ? <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{feedback}</div> : null}
        {error ? <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-[60vh] gap-6 overflow-x-auto pb-8">
          <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
            {filteredColumns.map((column) => (
              <Column
                key={column.id}
                column={column}
                onCreateTask={handleCreateTask}
                onRename={(name) => handleRenameColumn(column.id, name)}
                onDelete={() => handleDeleteColumn(column.id)}
                onSelectTask={setSelectedTask}
              />
            ))}
            <div className="flex h-fit min-w-[280px] flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Need another column?</p>
              <Button variant="ghost" onClick={() => setColumnDialogOpen(true)} className="justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Add column
              </Button>
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask ? <TaskOverlayCard task={activeTask} /> : null}
          {activeColumn ? <ColumnPreview column={activeColumn} /> : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a column</DialogTitle>
            <DialogDescription>
              Group related cards into a swimlane. We recommend naming columns after workflow stages.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-6 space-y-4" onSubmit={handleCreateColumn}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Column name</label>
              <Input
                value={columnName}
                onChange={(event) => setColumnName(event.target.value)}
                placeholder="QA Review"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setColumnDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create column
              </Button>
            </div>
          </form>
        </DialogContent>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
      </Dialog>

      <Dialog open={boardDialogOpen} onOpenChange={setBoardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Board settings</DialogTitle>
            <DialogDescription>Update metadata so your team always knows what this board tracks.</DialogDescription>
          </DialogHeader>
          <form className="mt-6 space-y-4" onSubmit={handleBoardUpdate}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={boardTitle} onChange={(event) => setBoardTitle(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={boardDescription}
                onChange={(event) => setBoardDescription(event.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setBoardDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
      </Dialog>

      <TaskDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(payload) => (selectedTask ? handleUpdateTask(selectedTask.id, payload) : Promise.resolve())}
        onDelete={() => (selectedTask ? handleDeleteTask(selectedTask.id) : Promise.resolve())}
        onCreateComment={(content) => (selectedTask ? handleCreateComment(selectedTask.id, content) : Promise.resolve())}
        onDeleteComment={(commentId) =>
          selectedTask ? handleDeleteComment(selectedTask.id, commentId) : Promise.resolve()
        }
        isSubmitting={isPending}
      />
    </div>
  );
}

function Column({
  column,
  onCreateTask,
  onRename,
  onDelete,
  onSelectTask,
}: {
  column: ColumnState;
  onCreateTask: (columnId: string, payload: { title: string; description?: string }) => Promise<void>;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSelectTask: (task: TaskState | null) => void;
}) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [nextName, setNextName] = useState(column.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: `column-drop-${column.id}`,
    data: { type: "column-droppable", columnId: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function handleSubmitNewTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    await onCreateTask(column.id, { title: title.trim(), description: description.trim() || undefined });
    setTitle("");
    setDescription("");
    setShowNewTask(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx("relative flex w-[320px] min-w-[320px] flex-col gap-3", isDragging && "opacity-60")}
      {...attributes}
    >
      <div
        className="flex cursor-grab items-center justify-between rounded-xl border border-border/80 bg-card/90 px-4 py-3 shadow-sm active:cursor-grabbing"
        {...listeners}
      >
        <div>
          <p className="font-medium text-foreground">{column.name}</p>
          <p className="text-xs text-muted-foreground">{column.tasks.length} task{column.tasks.length === 1 ? "" : "s"}</p>
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow">
              <DropdownMenu.Item
                onSelect={(event) => {
                  event.preventDefault();
                  setRenameOpen(true);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={(event) => {
                  event.preventDefault();
                  if (confirm("Delete column and all tasks?")) {
                    onDelete();
                  }
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div
        ref={setDropNodeRef}
        className={clsx(
          "flex flex-1 flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 transition",
          isOver && "border-primary bg-primary/5",
        )}
      >
        <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task)} />
          ))}
        </SortableContext>

        {showNewTask ? (
          <form onSubmit={handleSubmitNewTask} className="space-y-3 rounded-lg border border-border bg-background p-3 shadow-sm">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write a clear task title" required />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context (optional)"
              rows={3}
            />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewTask(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Add task
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" className="justify-start" onClick={() => setShowNewTask(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add task
          </Button>
        )}
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename column</DialogTitle>
            <DialogDescription>Update the name to better reflect the work captured here.</DialogDescription>
          </DialogHeader>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onRename(nextName);
              setRenameOpen(false);
            }}
          >
            <Input value={nextName} onChange={(event) => setNextName(event.target.value)} required />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
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

function TaskCard({ task, onClick }: { task: TaskState; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDateDisplay = task.dueDate ? format(new Date(task.dueDate), "MMM d") : null;
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group cursor-pointer rounded-lg border border-border/70 bg-card/90 p-3 shadow-sm transition hover:border-primary",
        isDragging && "opacity-60",
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <p className="font-medium text-foreground">{task.title}</p>
      {task.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p> : null}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {dueDateDisplay ? (
          <span className={clsx("flex items-center gap-1", isOverdue ? "text-destructive" : "text-muted-foreground")}
          >
            <CalendarDays className="h-3 w-3" /> {dueDateDisplay}
          </span>
        ) : null}
        {task.comments.length ? (
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {task.comments.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TaskOverlayCard({ task }: { task: TaskState }) {
  const dueDateDisplay = task.dueDate ? format(new Date(task.dueDate), "MMM d") : null;
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;

  return (
    <div className="group w-[300px] cursor-grabbing rounded-lg border border-dashed border-border/70 bg-card/90 p-3 shadow-lg">
      <p className="font-medium text-foreground">{task.title}</p>
      {task.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p> : null}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {dueDateDisplay ? (
          <span className={clsx("flex items-center gap-1", isOverdue ? "text-destructive" : "text-muted-foreground")}
          >
            <CalendarDays className="h-3 w-3" /> {dueDateDisplay}
          </span>
        ) : null}
        {task.comments.length ? (
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {task.comments.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ColumnPreview({ column }: { column: ColumnState }) {
  return (
    <div className="w-[320px] min-w-[320px] rounded-xl border border-border bg-card/90 p-3 shadow-lg">
      <p className="font-medium text-foreground">{column.name}</p>
      <p className="text-xs text-muted-foreground">{column.tasks.length} tasks</p>
    </div>
  );
}

function TaskDialog({ task, onClose, onUpdate, onDelete, onCreateComment, onDeleteComment, isSubmitting }: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState<string | "">(task?.dueDate ? task.dueDate.split("T")[0] : "");
  const [comment, setComment] = useState("");

  const isOpen = Boolean(task);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.dueDate ? task.dueDate.split("T")[0] : "");
    setComment("");
  }, [task]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Keep details crisp so your team knows exactly what to ship.</DialogDescription>
        </DialogHeader>
        {task ? (
          <div className="mt-6 grid gap-6 md:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Outline acceptance criteria, specs, or links"
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Due date</label>
                <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await onUpdate({
                        title,
                        description,
                        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                      });
                      onClose();
                    } catch {
                      /* handled upstream */
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      try {
                        await onDelete();
                      } catch {
                        /* handled upstream */
                      }
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Delete task
                </Button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">Activity</p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Comments</p>
                <div className="space-y-2">
                  {task.comments.map((commentItem) => (
                    <div key={commentItem.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {commentItem.author.firstName || commentItem.author.lastName
                            ? `${commentItem.author.firstName ?? ""} ${commentItem.author.lastName ?? ""}`.trim()
                            : "Team member"}
                        </span>
                        <span>{formatDistanceToNow(new Date(commentItem.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{commentItem.content}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs text-destructive hover:underline"
                        onClick={async () => {
                          try {
                            await onDeleteComment(commentItem.id);
                          } catch {
                            /* handled upstream */
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {!task.comments.length ? (
                    <p className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                      No comments yet. Leave the first update.
                    </p>
                  ) : null}
                </div>
                <form
                  className="space-y-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      await onCreateComment(comment);
                      setComment("");
                    } catch {
                      /* handled upstream */
                    }
                  }}
                >
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add a status update or note"
                    rows={3}
                  />
                  <Button type="submit" size="sm" disabled={!comment.trim()}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Post comment
                  </Button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
    </Dialog>
  );
}
