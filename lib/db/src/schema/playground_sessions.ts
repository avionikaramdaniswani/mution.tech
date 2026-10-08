import { pgTable, serial, integer, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { apiKeysTable } from "./api_keys";

export const playgroundSessionsTable = pgTable("playground_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Obrolan Baru"),
  apiKeyId: integer("api_key_id").references(() => apiKeysTable.id, { onDelete: "set null" }),
  model: text("model"),
  systemPrompt: text("system_prompt"),
  temperature: text("temperature").default("0.7"),
  maxTokens: text("max_tokens").default("1024"),
  messages: jsonb("messages").notNull().default('[]'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
