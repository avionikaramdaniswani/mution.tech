import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  cleanupInactiveApiKeys,
  ensureApiUsageKeyFkSetNull,
  getApiUsageKeyFkStatus,
  pool,
  postgresDeleteActionLabel,
} from "@workspace/db";

const command = process.argv[2];

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

function usage(): never {
  console.error("Usage:");
  console.error("  pnpm run cleanup:inactive-api-keys");
  console.error("  pnpm run db:check-api-usage-key-fk");
  console.error("  pnpm run db:fix-api-usage-key-fk");
  process.exit(1);
}

async function main() {
  switch (command) {
    case "cleanup-inactive-api-keys": {
      const deleted = await cleanupInactiveApiKeys();
      console.log(`Deleted ${deleted.length} inactive API key(s).`);
      break;
    }
    case "check-api-usage-key-fk": {
      const status = await getApiUsageKeyFkStatus();
      if (status.isValid) {
        console.log("api_usage.key_id foreign key is valid: ON DELETE SET NULL.");
        break;
      }

      if (status.constraints.length === 0) {
        console.log("api_usage.key_id foreign key is missing.");
        break;
      }

      console.log("api_usage.key_id foreign key needs repair:");
      for (const constraint of status.constraints) {
        console.log(`- ${constraint.constraintName}: ON DELETE ${postgresDeleteActionLabel(constraint.deleteAction)}`);
      }
      break;
    }
    case "fix-api-usage-key-fk": {
      const result = await ensureApiUsageKeyFkSetNull();
      if (!result.changed) {
        console.log("api_usage.key_id foreign key is already valid: ON DELETE SET NULL.");
        break;
      }

      console.log("api_usage.key_id foreign key repaired: ON DELETE SET NULL.");
      console.log(`Cleared ${result.orphanedUsageRowsCleared} orphaned api_usage.key_id value(s).`);
      break;
    }
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
