#!/usr/bin/env node
/**
 * Non-interactive DB migration runner.
 * Safe for CI and non-TTY shells (unlike `drizzle-kit push`).
 *
 * Handles two cases automatically:
 *   1. Fresh DB      — runs all pending SQL migrations from lib/db/migrations/.
 *   2. Existing DB   — detects that the schema is already applied but the Drizzle
 *                      migrations tracking table is missing/empty, and seeds the
 *                      baseline record so future `migrate()` calls are no-ops.
 *
 * Usage (from workspace root):
 *   pnpm --filter @workspace/db run migrate
 *
 * Required env:
 *   SUPABASE_DATABASE_URL  — Supabase Postgres connection string
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { Pool, Client } = pg;

const connectionString =
  process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "ERROR: SUPABASE_DATABASE_URL (or DATABASE_URL) must be set before running migrations.",
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../migrations");
const journalPath = path.join(migrationsFolder, "meta/_journal.json");

/**
 * Seed the Drizzle migrations tracking table for an already-provisioned DB.
 * This is needed when the schema exists but the tracking table was never created
 * (e.g. the project was originally set up with `drizzle-kit push`, not `migrate`).
 *
 * Drizzle stores migration records in the "drizzle" schema:
 *   drizzle.__drizzle_migrations (id, hash, created_at)
 *
 * We only insert if:
 *   - The users table already exists (schema is applied), AND
 *   - The tracking table has no rows for the baseline migration.
 */
async function seedBaselineIfNeeded(client) {
  // Check if the schema is already applied by probing a known table
  const { rows: existing } = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
    LIMIT 1
  `);
  if (existing.length === 0) {
    // Fresh DB — nothing to seed, migrate() will create everything
    return false;
  }

  // Schema exists. Ensure the drizzle tracking schema + table exist.
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  // Check if any migration is already recorded
  const { rows: recorded } = await client.query(
    "SELECT id FROM drizzle.__drizzle_migrations LIMIT 1",
  );
  if (recorded.length > 0) {
    return false; // Already seeded — nothing to do
  }

  // Read the journal and compute hashes for all baseline migration files
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  for (const entry of journal.entries) {
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
    await client.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [hash, entry.when],
    );
    console.log(`  Seeded baseline migration: ${entry.tag}`);
  }

  console.log(
    "Existing DB detected — baseline migration(s) marked as applied. Future schema changes will run normally.",
  );
  return true;
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

// Use a direct client for the seeding check (outside the drizzle session)
const seedClient = new Client({ connectionString });
await seedClient.connect();
try {
  await seedBaselineIfNeeded(seedClient);
} finally {
  await seedClient.end();
}

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
