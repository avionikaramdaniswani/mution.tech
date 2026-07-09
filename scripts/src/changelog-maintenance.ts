import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pool } from "@workspace/db";

const command = process.argv[2];

type LegacyChange = {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  text?: unknown;
};

function loadDotEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
  ];
  const filePath = candidates.find((candidate) => existsSync(candidate));
  if (!filePath) return;

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function hasDatabaseUrl() {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

function normalizeChange(change: LegacyChange) {
  const title = typeof change.title === "string" ? change.title : typeof change.text === "string" ? change.text : "";
  const description = typeof change.description === "string" && change.description.trim() ? change.description : undefined;
  const type = change.type === "feat" || change.type === "fix" || change.type === "chore" ? change.type : "chore";

  return { type, title, description };
}

function normalizeChanges(changes: unknown) {
  if (!Array.isArray(changes)) return [];
  return changes.map((change) => normalizeChange((change ?? {}) as LegacyChange));
}

function needsMigration(changes: unknown) {
  return Array.isArray(changes) && changes.some((change) => {
    const item = (change ?? {}) as LegacyChange;
    return typeof item.text === "string" || typeof item.title !== "string";
  });
}

async function migrateChangelogChanges() {
  const result = await pool.query<{ id: number; changes: unknown }>("select id, changes from changelogs");
  let updated = 0;

  for (const row of result.rows) {
    if (!needsMigration(row.changes)) continue;
    const normalized = normalizeChanges(row.changes);
    await pool.query("update changelogs set changes = $1::jsonb, updated_at = now() where id = $2", [
      JSON.stringify(normalized),
      row.id,
    ]);
    updated += 1;
  }

  console.log(`Migrated ${updated} changelog row(s).`);
}

function usage(): never {
  console.error("Usage:");
  console.error("  pnpm run db:migrate-changelog-changes");
  process.exit(1);
}

async function main() {
  switch (command) {
    case "migrate-change-items":
      await migrateChangelogChanges();
      break;
    default:
      usage();
  }
}

loadDotEnv();

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (hasDatabaseUrl()) {
      await pool.end().catch(() => undefined);
    }
  });
