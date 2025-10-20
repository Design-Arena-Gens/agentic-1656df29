import Link from "next/link";
import { Suspense } from "react";

import { UserMenu } from "@/components/header/user-menu";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const { user } = session;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow">
              T
            </Link>
            <div className="leading-tight">
              <Link href="/boards" className="font-semibold text-lg text-foreground hover:text-primary">
                Tasky
              </Link>
              <p className="text-xs text-muted-foreground">Operate with focus, move work forward.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/boards">My boards</Link>
            </Button>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {user?.firstName ? `Hey, ${user.firstName}` : "You're signed in"}
            </p>
            <Suspense fallback={<div className="h-10 w-10 animate-pulse rounded-full bg-muted" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
