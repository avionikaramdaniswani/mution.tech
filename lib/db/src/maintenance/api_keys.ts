import { and, eq } from "drizzle-orm";
import type pg from "pg";
import { apiKeysTable } from "../schema/api_keys";
import { db, pool } from "../index";

type Queryable = Pick<pg.Pool | pg.PoolClient, "query">;

export type ApiUsageKeyFkConstraint = {
  constraintName: string;
  deleteAction: string;
};

export type ApiUsageKeyFkStatus = {
  isValid: boolean;
  constraints: ApiUsageKeyFkConstraint[];
};

const API_USAGE_KEY_FK_NAME = "api_usage_key_id_api_keys_id_fk";

const API_USAGE_KEY_FK_QUERY = `
  select
    c.conname as "constraintName",
    c.confdeltype as "deleteAction"
  from pg_constraint c
  join pg_class rel on rel.oid = c.conrelid
  join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
  join pg_class ref on ref.oid = c.confrelid
  join pg_namespace ref_ns on ref_ns.oid = ref.relnamespace
  where c.contype = 'f'
    and rel_ns.nspname = current_schema()
    and ref_ns.nspname = current_schema()
    and rel.relname = 'api_usage'
    and ref.relname = 'api_keys'
    and c.conkey = array[
      (
        select attnum::smallint
        from pg_attribute
        where attrelid = c.conrelid
          and attname = 'key_id'
          and not attisdropped
      )
    ]::smallint[]
    and c.confkey = array[
      (
        select attnum::smallint
        from pg_attribute
        where attrelid = c.confrelid
          and attname = 'id'
          and not attisdropped
      )
    ]::smallint[]
`;

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function postgresDeleteActionLabel(action: string): string {
  switch (action) {
    case "a":
      return "NO ACTION";
    case "r":
      return "RESTRICT";
    case "c":
      return "CASCADE";
    case "n":
      return "SET NULL";
    case "d":
      return "SET DEFAULT";
    default:
      return action;
  }
}

export async function cleanupInactiveApiKeys(options: { userId?: number } = {}) {
  const where =
    typeof options.userId === "number"
      ? and(eq(apiKeysTable.userId, options.userId), eq(apiKeysTable.isActive, false))
      : eq(apiKeysTable.isActive, false);

  return db
    .delete(apiKeysTable)
    .where(where)
    .returning({ id: apiKeysTable.id, userId: apiKeysTable.userId });
}

export async function deleteApiKeyForUser(input: { id: number; userId: number }) {
  const [deleted] = await db
    .delete(apiKeysTable)
    .where(and(eq(apiKeysTable.id, input.id), eq(apiKeysTable.userId, input.userId)))
    .returning();

  return deleted ?? null;
}

export async function getApiUsageKeyFkStatus(queryable: Queryable = pool): Promise<ApiUsageKeyFkStatus> {
  const result = await queryable.query<ApiUsageKeyFkConstraint>(API_USAGE_KEY_FK_QUERY);
  const constraints = result.rows.map((row) => ({
    constraintName: row.constraintName,
    deleteAction: row.deleteAction,
  }));

  return {
    constraints,
    isValid: constraints.length === 1 && constraints[0]?.deleteAction === "n",
  };
}

export async function ensureApiUsageKeyFkSetNull(): Promise<{
  changed: boolean;
  orphanedUsageRowsCleared: number;
  status: ApiUsageKeyFkStatus;
}> {
  const client = await pool.connect();

  try {
    const currentStatus = await getApiUsageKeyFkStatus(client);
    if (currentStatus.isValid) {
      return {
        changed: false,
        orphanedUsageRowsCleared: 0,
        status: currentStatus,
      };
    }

    await client.query("begin");

    const orphanedUsageRows = await client.query(`
      update api_usage usage
      set key_id = null
      where usage.key_id is not null
        and not exists (
          select 1
          from api_keys keys
          where keys.id = usage.key_id
        )
    `);

    for (const constraint of currentStatus.constraints) {
      await client.query(`alter table api_usage drop constraint if exists ${quoteIdent(constraint.constraintName)}`);
    }

    await client.query(`
      alter table api_usage
      add constraint ${quoteIdent(API_USAGE_KEY_FK_NAME)}
      foreign key (key_id)
      references api_keys(id)
      on delete set null
    `);

    await client.query("commit");

    return {
      changed: true,
      orphanedUsageRowsCleared: orphanedUsageRows.rowCount ?? 0,
      status: await getApiUsageKeyFkStatus(client),
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
