import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { apiKeysTable } from "./api_keys";

export const apiRequestsTable = pgTable(
  "api_requests",
  {
    id: serial("id").primaryKey(),
    requestId: text("request_id").notNull().unique(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    keyId: integer("key_id").references(() => apiKeysTable.id, { onDelete: "set null" }),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(),
    model: text("model"),
    providerId: text("provider_id"),
    statusCode: integer("status_code").notNull(),
    success: boolean("success").notNull().default(false),
    errorType: text("error_type"),
    latencyMs: integer("latency_ms").notNull().default(0),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    /** Lihat catatan di schema/api_usage.ts — info transparansi saja, tidak memengaruhi pricing. */
    cachedTokens: integer("cached_tokens").notNull().default(0),
    credits: integer("credits").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("api_requests_created_at_idx").on(t.createdAt),
    index("api_requests_user_id_idx").on(t.userId),
    index("api_requests_key_id_idx").on(t.keyId),
    index("api_requests_status_code_idx").on(t.statusCode),
    index("api_requests_success_idx").on(t.success),
    index("api_requests_error_type_idx").on(t.errorType),
  ],
);

export type ApiRequest = typeof apiRequestsTable.$inferSelect;
