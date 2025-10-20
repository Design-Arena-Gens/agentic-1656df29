import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsla(var(--primary)/0.15)_0,_transparent_60%)]" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-lg">
            T
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">Tasky</p>
            <p className="text-sm text-muted-foreground">Ship faster with a focused workflow</p>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <SignedOut>
            <Button asChild variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Create free account</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button asChild>
              <Link href="/boards">Go to workspace</Link>
            </Button>
          </SignedIn>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="max-w-3xl space-y-6">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Kanban, streamlined
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Manage product delivery with{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              real-time clarity
            </span>
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Tasky keeps teams aligned with collaborative boards, lightning-fast updates, and secure authentication
            powered by Clerk. Plan roadmaps, track progress, and leave the chaos of spreadsheets behind.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SignedIn>
              <Button asChild size="lg">
                <Link href="/boards">Open your boards</Link>
              </Button>
            </SignedIn>
            <SignedOut>
              <Button asChild size="lg">
                <Link href="/sign-up">Start for free</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </SignedOut>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/60 bg-background/70 py-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Tasky. Built for high-velocity teams.</p>
          <div className="flex flex-wrap items-center gap-4">
            <span>Next.js 15 App Router</span>
            <span>Clerk Authentication</span>
            <span>Prisma · Postgres</span>
            <span>TailwindCSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
