<div align="center">

# Tasky

Trello-inspired Kanban for modern product teams. Powered by Next.js 15, Clerk, Prisma, and TailwindCSS.

</div>

## Overview

Tasky delivers a focused, production-ready project management experience that keeps cross-functional teams aligned. Boards, workflow columns, real-time task details, comments, and drag-and-drop prioritisation are all built on a reliable Next.js 15 App Router foundation with Clerk authentication and Prisma/Postgres persistence.

## Stack

- **Next.js 15 (App Router)** with React 19
- **Clerk** for authentication and session management
- **Prisma ORM** backed by PostgreSQL
- **TailwindCSS v4** for design system utility classes
- **Radix UI primitives** for accessible dialogs and menus
- **Dnd Kit** for fluid drag-and-drop across columns

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+ with a database ready for Tasky
- Clerk application with publishable and secret keys

## Environment Variables

Duplicate `.env.example` and configure your credentials:

```bash
cp .env.example .env
```

Populate the following values:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL` (e.g. `postgresql://USER:PASSWORD@localhost:5432/tasky`)

## Installation

```bash
npm install

# optional: verify Prisma client is generated
npx prisma generate

# apply the initial migration (creates tables)
npx prisma migrate deploy
```

> Tip: During local development you can use `npm run db:push` to sync the schema without generating a migration.

## Development

```bash
npm run dev
```

Visit `http://localhost:3000` for the marketing landing page. The authenticated workspace lives under `/boards` and requires signing in with Clerk.

## Quality & Tooling

- `npm run lint` – ESLint with Next.js rules
- `npm run db:studio` – Prisma Studio for inspecting the database

## Deployment

The project is optimised for Vercel deployment:

1. Ensure the production database connection string and Clerk keys are added to Vercel project environment variables
2. Trigger a production build locally with `npm run build`
3. Deploy using the provided command:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-1656df29
```

After deployment, verify the site is live:

```bash
curl https://agentic-1656df29.vercel.app
```

## Database Schema Snapshot

The initial Prisma migration (`prisma/migrations/0001_init`) provisions the following entities:

- `User`: synced from Clerk profile metadata
- `Board`: Kanban board with owner relationship
- `Column`: ordered workflow lanes scoped to a board
- `Task`: cards with due dates, assignee reference, and column position
- `Comment`: threaded discussion authored by team members

All destructive operations cascade so that deleting a board also clears its nested columns, tasks, and comment history.

---

Built with ❤️ to help high-velocity teams stay coordinated.
