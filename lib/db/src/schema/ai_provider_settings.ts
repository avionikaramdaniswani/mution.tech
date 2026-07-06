import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const aiProviderSettingsTable = pgTable("ai_provider_settings", {
  id: text("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AiProviderSetting = typeof aiProviderSettingsTable.$inferSelect;
