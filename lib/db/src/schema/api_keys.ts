import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const apiKeysTable = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("My API Key"),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPlain: text("key_plain"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  totalTokensUsed: integer("total_tokens_used").notNull().default(0),
  totalRequestsCount: integer("total_requests_count").notNull().default(0),
  totalCreditsUsed: integer("total_credits_used").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  creditLimit: integer("credit_limit"),
  allowedModels: text("allowed_models").array(),
});

export type ApiKey = typeof apiKeysTable.$inferSelect;
