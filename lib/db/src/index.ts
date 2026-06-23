import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getDbUrl(): string {
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return dbUrl;
}

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const dbUrl = getDbUrl();
    _pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
    });
  }
  return _pool;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

export { schema };
export * from "./schema";

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
