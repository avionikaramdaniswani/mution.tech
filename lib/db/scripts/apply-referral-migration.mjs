#!/usr/bin/env node
/**
 * One-off script: mark 0003_credit_packages as applied (if table exists but not tracked),
 * then apply 0004_referral_system SQL directly.
 */
import pg from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../migrations");

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) { console.error("No DB URL"); process.exit(1); }

const client = new Client({ connectionString });
await client.connect();

try {
  // Ensure tracking table exists
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
    )
  `);

  // Check which migration tags are already recorded
  const { rows: recorded } = await client.query("SELECT hash FROM drizzle.__drizzle_migrations");
  const recordedHashes = new Set(recorded.map(r => r.hash));
  console.log(`Currently tracked migrations: ${recorded.length}`);

  // Tags to ensure are marked as applied (in order)
  const tags = [
    { tag: "0000_powerful_tomas",          when: 1783783163589 },
    { tag: "0001_vengeful_secret_warriors", when: 1783842772346 },
    { tag: "0002_model_pricing_overrides",  when: 1783931100000 },
    { tag: "0003_credit_packages",          when: 1784199000000 },
  ];

  for (const { tag, when } of tags) {
    const sqlPath = path.join(migrationsFolder, `${tag}.sql`);
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
    if (!recordedHashes.has(hash)) {
      await client.query(
        "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
        [hash, when]
      );
      console.log(`  Marked as applied: ${tag}`);
    } else {
      console.log(`  Already tracked: ${tag}`);
    }
  }

  // Now apply 0004 if referrals table doesn't exist yet
  const { rows: hasReferrals } = await client.query(`
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals' LIMIT 1
  `);

  if (hasReferrals.length > 0) {
    console.log("referrals table already exists — skipping 0004 DDL");
  } else {
    console.log("Applying 0004_referral_system ...");
    // Apply statements one by one
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" text UNIQUE`);
    await client.query(`DO $$ BEGIN CREATE TYPE "public"."referral_status" AS ENUM('pending', 'rewarded'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "referrals" (
        "id" serial PRIMARY KEY NOT NULL,
        "referrer_id" integer NOT NULL,
        "referee_id" integer NOT NULL,
        "status" "referral_status" DEFAULT 'pending' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "rewarded_at" timestamp,
        CONSTRAINT "referrals_referee_id_unique" UNIQUE("referee_id")
      )
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    console.log("0004_referral_system applied.");
  }

  // Mark 0004 as tracked
  const sql0004 = fs.readFileSync(path.join(migrationsFolder, "0004_referral_system.sql"), "utf8");
  const hash0004 = crypto.createHash("sha256").update(sql0004).digest("hex");
  if (!recordedHashes.has(hash0004)) {
    await client.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [hash0004, 1784199100000]
    );
    console.log("  Marked as applied: 0004_referral_system");
  } else {
    console.log("  Already tracked: 0004_referral_system");
  }

  console.log("Done!");
} finally {
  await client.end();
}
