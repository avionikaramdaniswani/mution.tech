import {
  pgTable,
  serial,
  integer,
  varchar,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { apiKeysTable } from "./api_keys";

export const apiUsageDailyTable = pgTable(
  "api_usage_daily",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    keyId: integer("key_id").notNull().default(-1),
    model: varchar("model", { length: 255 }).notNull().default(""),
    status: varchar("status", { length: 50 }).notNull(), // 'success' or 'error'
    date: date("date").notNull(), // 'YYYY-MM-DD'
    totalRequests: integer("total_requests").notNull().default(0),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    cachedTokens: integer("cached_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    totalCredits: integer("total_credits").notNull().default(0),
  },
  (table) => ({
    uniqueDaily: uniqueIndex("api_usage_daily_unique_idx").on(
      table.userId,
      table.keyId,
      table.model,
      table.status,
      table.date
    ),
  })
);
