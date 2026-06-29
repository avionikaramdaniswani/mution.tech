# PaaS Platform Dashboard

Platform as a Service berbasis web, mirip Railway/Render — untuk deploy dan manage aplikasi containerized di atas VM sendiri.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 3001)
- `pnpm --filter @workspace/paas-dashboard run dev` — run the frontend (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `SUPABASE_DATABASE_URL` — Supabase Postgres connection string
- `CONDUIT_API_KEY` — Conduit API key (sk-cdt-...)
- `CONDUIT_BASE_URL` — Conduit base URL (default: https://conduit.ozdoev.net)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query
- API: Express 5
- DB: **Supabase PostgreSQL** + Drizzle ORM
- Auth: Session-based (cookie, httpOnly) + bcryptjs
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)
- AI Proxy: Conduit (one key, every model)

## Database — WAJIB BACA

> **DATABASE INI SUPABASE. JANGAN PERNAH DIGANTI KE REPLIT DB ATAU DB LAIN.**
>
> - Koneksi database selalu menggunakan `SUPABASE_DATABASE_URL` (prioritas utama)
> - `DATABASE_URL` hanya fallback jika `SUPABASE_DATABASE_URL` tidak ada
> - Semua data pengguna, proyek, deployment, dan transaksi ada di Supabase
> - Jangan jalankan `createDatabase()` atau ganti connection string ke Replit DB
> - Jangan hapus atau timpa secret `SUPABASE_DATABASE_URL`
> - SSL wajib aktif untuk koneksi Supabase (`rejectUnauthorized: false`)
>
> File yang mengatur koneksi DB:
> - `lib/db/src/index.ts` — DB client (gunakan `SUPABASE_DATABASE_URL`)
> - `lib/db/drizzle.config.ts` — Drizzle config (gunakan `SUPABASE_DATABASE_URL`)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema files (users, projects, deployments, env_vars, project_databases, activity_logs, sessions)
- `artifacts/api-server/src/routes/` — auth, projects, deployments, stats, activity, admin, billing, api-keys
- `artifacts/api-server/src/lib/auth.ts` — session-based auth middleware
- `artifacts/api-server/src/lib/activity.ts` — activity log helper
- `artifacts/paas-dashboard/src/` — React frontend
- `artifacts/paas-dashboard/src/pages/billing/` — billing page (saldo & riwayat transaksi)

## Architecture decisions

- Session-based auth via httpOnly cookies (no JWT) — simpler, more secure for web-only
- Coolify integration intentionally omitted in first build — stub endpoints ready to wire up
- Env var values masked on all API responses (stored in plain text, shown as `***`)
- Project database provisioning is simulated — ready for real Coolify API calls
- Deployment pipeline is simulated with realistic build logs and status — ready for Coolify webhooks
- Billing: credit balance dan riwayat transaksi. Topup dikelola manual oleh admin.

## Product

- Auth: register, login, logout, session-based
- Dashboard: project stats, recent deployments, 30-day deployment chart
- Projects: CRUD, stop/restart, per-project env vars, per-project database provisioning
- Deployments: trigger, view logs, rollback
- Activity log: per-user action history
- Admin panel: all users, all projects, force stop/delete, platform stats
- Billing: credit balance, riwayat transaksi

## Environment variables yang dibutuhkan

- `SUPABASE_DATABASE_URL` — Supabase Postgres connection string (wajib)
- `CONDUIT_API_KEY` — Conduit API key (sk-cdt-...)
- `CONDUIT_BASE_URL` — Conduit base URL (default: https://conduit.ozdoev.net)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Run `pnpm --filter @workspace/db run push` after changing DB schema
- Coolify integration routes need to be wired into the project stop/restart/deploy routes in `artifacts/api-server/src/routes/`
- Import `z` dari `"zod"` bukan `"zod/v4"` — esbuild tidak bisa resolve sub-path `zod/v4`
- `zod` harus jadi direct dependency di `artifacts/api-server/package.json` agar bisa di-bundle

## User preferences

- Database: **Supabase** — tidak boleh diganti ke Replit DB atau DB lain apapun
- Coolify integration to be added later (skipped on first build)
- Stack: Express + React/Vite (not Next.js), Drizzle ORM (not Prisma)
