#!/usr/bin/env node
/**
 * Non-interactive DB migration runner.
 * Uses drizzle-orm's migrate() which applies SQL files from lib/db/migrations/
 * and is safe to run in CI / non-TTY environments (unlike `drizzle-kit push`).
 *
 * Usage:
 *   node scripts/db-migrate.mjs
 *
 * Required env:
 *   SUPABASE_DATABASE_URL  — Supabase Postgres connection string
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { Pool } = pg;

const connectionString =
  process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "ERROR: SUPABASE_DATABASE_URL (or DATABASE_URL) must be set before running migrations.",
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../lib/db/migrations");

const pool = new Pool({ connectionString });
const db = drizzle(pool);

console.log("Running DB migrations from", migrationsFolder, "...");

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
