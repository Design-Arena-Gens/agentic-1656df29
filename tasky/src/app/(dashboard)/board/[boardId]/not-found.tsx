import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function BoardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-foreground">Board not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The board you are looking for is missing or you no longer have access. Try heading back to your workspace to pick another board.
        </p>
      </div>
      <Button asChild>
        <Link href="/boards">Back to boards</Link>
      </Button>
    </div>
  );
}
