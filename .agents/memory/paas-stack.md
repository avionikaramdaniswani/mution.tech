---
name: PaaS Platform Stack Decision
description: Stack pilihan proyek Mution — keputusan yang harus konsisten di semua sesi.
---

## Stack

- **Frontend:** React + Vite + Wouter + TanStack Query (bukan Next.js)
- **Backend:** Express 5 + TypeScript
- **DB:** **Supabase PostgreSQL** + Drizzle ORM (bukan Prisma, BUKAN Replit DB)
- **Auth:** Session-based httpOnly cookies + bcryptjs (bukan JWT, bukan Supabase Auth)
- **Monorepo:** pnpm workspaces
- **Codegen:** Orval dari OpenAPI spec (`lib/api-spec/openapi.yaml`)
- **Payment:** DOKU payment gateway

**Why:** Dipilih oleh user. Database adalah Supabase yang sudah berisi data nyata — mengganti DB akan menghilangkan semua data user.

**How to apply:**
- Database WAJIB via `SUPABASE_DATABASE_URL` — lihat supabase-constraint.md
- Selalu import `z` dari `"zod"` bukan `"zod/v4"` (esbuild tidak bisa resolve sub-path)
- `zod` harus jadi direct dependency di `artifacts/api-server/package.json`
- Setelah ubah `openapi.yaml`, jalankan `pnpm --filter @workspace/api-spec run codegen`
- API server port 3001, frontend port 5000
- DOKU: `DOKU_ENV=production` untuk production, kosong = sandbox
- Coolify integration belum dibangun — skip dulu, wire ke routes projects/deployments nanti
