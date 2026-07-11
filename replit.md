# Mution — PaaS & AI Gateway Dashboard

## Overview
A full-stack PaaS dashboard for deploying apps, managing API keys, tracking credit usage, and operating digital products. Integrates with Coolify (deployment engine), GitHub OAuth, Supabase PostgreSQL (database), and TriPay (billing).

## Stack
- **Backend**: Express 5 (TypeScript, ESM) — `artifacts/api-server`
- **Frontend**: React + Vite + Tailwind + shadcn/ui — `artifacts/paas-dashboard`
- **Database**: Drizzle ORM → Supabase PostgreSQL
- **Monorepo**: pnpm workspaces
- **Shared libs**: `lib/db`, `lib/api-zod`, `lib/api-client-react`, `lib/model-catalog`, `lib/api-spec`

## How to Run
The **Start application** workflow builds both packages and serves everything on port 5000:
```
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/paas-dashboard run build
NODE_ENV=production PORT=5000 node --enable-source-maps artifacts/api-server/dist/index.mjs
```

For development (hot reload):
```
pnpm run dev
```
- API on port 5000 (via `pnpm run dev:api`)
- Vite dev server on port 5001 (via `pnpm run dev:web`)

## Required Secrets
All secrets are configured via Replit Secrets:
| Secret | Purpose |
|--------|---------|
| `SUPABASE_DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Cookie session signing |
| `COOLIFY_API_TOKEN` | Coolify API access |
| `COOLIFY_API_URL` | Coolify instance URL |
| `COOLIFY_DEFAULT_GIT_BRANCH` | Default git branch for deployments |
| `COOLIFY_SERVER_NAME` | Coolify server name |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `TRIPAY_API_KEY` | TriPay payment gateway API key |
| `TRIPAY_MERCHANT_CODE` | TriPay merchant code |
| `TRIPAY_PRIVATE_KEY` | TriPay private key |
| `TRIPAY_MODE` | `sandbox` or `production` |

## Database
Uses Drizzle ORM with migrations in `lib/db/migrations/`. To run migrations:
```
pnpm --filter @workspace/db run migrate
```

## User Preferences
- Use pnpm (not npm/yarn) — enforced by preinstall script
- Keep the existing monorepo structure
- Database must stay on Supabase (SUPABASE_DATABASE_URL)
