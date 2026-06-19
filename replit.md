# PaaS Platform Dashboard

Platform as a Service berbasis web, mirip Railway/Render — untuk deploy dan manage aplikasi containerized di atas VM sendiri.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/paas-dashboard run dev` — run the frontend (dev)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Session-based (cookie, httpOnly) + bcryptjs
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema files (users, projects, deployments, env_vars, project_databases, activity_logs, sessions)
- `artifacts/api-server/src/routes/` — auth, projects, deployments, stats, activity, admin
- `artifacts/api-server/src/lib/auth.ts` — session-based auth middleware
- `artifacts/api-server/src/lib/activity.ts` — activity log helper
- `artifacts/paas-dashboard/src/` — React frontend

## Architecture decisions

- Session-based auth via httpOnly cookies (no JWT) — simpler, more secure for web-only
- Coolify integration intentionally omitted in first build — stub endpoints ready to wire up
- Env var values masked on all API responses (stored in plain text, shown as `***`)
- Project database provisioning is simulated — ready for real Coolify API calls
- Deployment pipeline is simulated with realistic build logs and status — ready for Coolify webhooks

## Product

- Auth: register, login, logout, session-based
- Dashboard: project stats, recent deployments, 30-day deployment chart
- Projects: CRUD, stop/restart, per-project env vars, per-project database provisioning
- Deployments: trigger, view logs, rollback
- Activity log: per-user action history
- Admin panel: all users, all projects, force stop/delete, platform stats

## Test accounts

- `admin@paas.local` / `admin123` — admin role (can access /admin panel)
- `budi@example.com` / `user123` — regular user with 3 projects seeded
- `sari@example.com` / `user123` — regular user with 1 project seeded

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Run `pnpm --filter @workspace/db run push` after changing DB schema
- Coolify integration routes need to be wired into the project stop/restart/deploy routes in `artifacts/api-server/src/routes/`

## User preferences

- Coolify integration to be added later (skipped on first build)
- Stack: Express + React/Vite (not Next.js), Drizzle ORM (not Prisma), Replit DB (not Supabase)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
