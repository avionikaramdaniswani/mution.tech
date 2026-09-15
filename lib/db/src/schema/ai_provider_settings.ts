import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const aiProviderSettingsTable = pgTable("ai_provider_settings", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  baseUrl: text("base_url").notNull().default(""),
  apiKeyEncrypted: text("api_key_encrypted").notNull().default(""),
  type: text("type").notNull().default("generic"),
  priority: integer("priority").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AiProviderSetting = typeof aiProviderSettingsTable.$inferSelect;
