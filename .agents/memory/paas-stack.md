---
name: PaaS Platform Stack Decision
description: Why the PaaS platform uses a different stack than the user's original spec
---

User originally requested Next.js 14, Supabase, Prisma, and Supabase Auth. The Replit monorepo uses Express 5 + React/Vite + Drizzle ORM + Replit PostgreSQL instead.

**Why:** Replit workspace is pre-configured with Express + Vite; Next.js would require a separate bootstrap. Replit DB is preferred over Supabase (built-in, no external dependency). Drizzle is the workspace ORM standard. Session-based auth (httpOnly cookie + bcryptjs) was chosen over Supabase Auth to avoid external service dependency.

**How to apply:** If user asks to add Supabase or Next.js features, adapt to the existing stack. Auth is in `artifacts/api-server/src/lib/auth.ts`. Session cookie name is `paas_session`.

Coolify integration is intentionally not built yet — the user said to skip it for the first build. Wire it into the stop/restart/deploy routes in `artifacts/api-server/src/routes/projects.ts` and `deployments.ts` when ready.
