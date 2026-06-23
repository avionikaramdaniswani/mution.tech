---
name: Supabase DB Constraint
description: Project ini WAJIB pakai Supabase PostgreSQL. Dilarang keras ganti ke Replit DB atau DB lain.
---

## Aturan

Database proyek ini adalah **Supabase PostgreSQL**. Tidak boleh diganti ke Replit DB, SQLite, atau DB lain apapun.

**Why:** Semua data pengguna nyata (user, proyek, deployment, transaksi) ada di Supabase. Mengganti DB berarti kehilangan semua data.

**How to apply:**
- Koneksi DB selalu via `SUPABASE_DATABASE_URL` (prioritas utama) — lihat `lib/db/src/index.ts`
- Fallback ke `DATABASE_URL` hanya jika `SUPABASE_DATABASE_URL` tidak ada
- SSL wajib aktif untuk Supabase: `ssl: { rejectUnauthorized: false }`
- Drizzle config di `lib/db/drizzle.config.ts` juga harus pakai `SUPABASE_DATABASE_URL`
- Jangan jalankan Replit DB provisioning, jangan timpa `SUPABASE_DATABASE_URL`
- Seed/migration hanya boleh dijalankan ke Supabase, bukan Replit DB
