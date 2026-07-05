import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  apiKeysTable,
  apiUsageTable,
  db,
  deleteApiKeyForUser,
  ensureApiUsageKeyFkSetNull,
  pool,
  usersTable,
} from "@workspace/db";

const runDbTests = process.env.RUN_DB_TESTS === "1";

if (runDbTests) {
  after(async () => {
    await pool.end();
  });
}

test(
  "hard delete removes only the owner's API key and preserves usage history",
  { skip: runDbTests ? false : "Set RUN_DB_TESTS=1 to run database integration tests." },
  async () => {
    await ensureApiUsageKeyFkSetNull();

    const suffix = randomUUID();
    const createdUserIds: number[] = [];

    try {
      const [owner] = await db
        .insert(usersTable)
        .values({
          email: `api-key-owner-${suffix}@example.test`,
          name: "API Key Owner",
          passwordHash: "test-password-hash",
        })
        .returning();

      const [otherUser] = await db
        .insert(usersTable)
        .values({
          email: `api-key-other-${suffix}@example.test`,
          name: "Other User",
          passwordHash: "test-password-hash",
        })
        .returning();

      assert.ok(owner);
      assert.ok(otherUser);
      createdUserIds.push(owner.id, otherUser.id);

      const [apiKey] = await db
        .insert(apiKeysTable)
        .values({
          userId: owner.id,
          name: "Integration Test Key",
          keyPrefix: "mk_test_deleted...",
          keyHash: `test-hash-${suffix}`,
        })
        .returning();

      assert.ok(apiKey);

      const [usage] = await db
        .insert(apiUsageTable)
        .values({
          userId: owner.id,
          keyId: apiKey.id,
          model: "test-model",
          promptTokens: 2,
          completionTokens: 3,
          totalTokens: 5,
          credits: 10,
        })
        .returning();

      assert.ok(usage);

      const unauthorizedDelete = await deleteApiKeyForUser({ id: apiKey.id, userId: otherUser.id });
      assert.equal(unauthorizedDelete, null);

      const [stillExists] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, apiKey.id));
      assert.equal(stillExists?.id, apiKey.id);

      const deleted = await deleteApiKeyForUser({ id: apiKey.id, userId: owner.id });
      assert.equal(deleted?.id, apiKey.id);

      const keysAfterDelete = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, apiKey.id));
      assert.equal(keysAfterDelete.length, 0);

      const [usageAfterDelete] = await db.select().from(apiUsageTable).where(eq(apiUsageTable.id, usage.id));
      assert.ok(usageAfterDelete);
      assert.equal(usageAfterDelete.keyId, null);
    } finally {
      for (const userId of createdUserIds.reverse()) {
        await db.delete(usersTable).where(eq(usersTable.id, userId));
      }
    }
  },
);
