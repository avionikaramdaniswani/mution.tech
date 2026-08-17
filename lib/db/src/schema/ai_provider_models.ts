import { boolean, pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const aiProviderModelsTable = pgTable("ai_provider_models", {
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  displayName: text("display_name").notNull(),
  brandProvider: text("brand_provider").notNull(),
  upstreamModelId: text("upstream_model_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.providerId, table.modelId] }),
}));

export type AiProviderModel = typeof aiProviderModelsTable.$inferSelect;
