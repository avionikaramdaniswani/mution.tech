import { integer, numeric, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const pricingModeEnum = pgEnum("pricing_mode", [
  "default",
  "discount_percent",
  "fixed_price",
  "free",
]);

export const modelPricingOverridesTable = pgTable("model_pricing_overrides", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull().unique(),
  mode: pricingModeEnum("mode").notNull().default("default"),
  /** Nilai 0–100. Hanya dipakai saat mode = "discount_percent". */
  discountPercent: integer("discount_percent"),
  /** Harga custom per 1 juta token input. Hanya dipakai saat mode = "fixed_price". */
  inputPriceOverride: numeric("input_price_override", { precision: 20, scale: 10 }),
  /** Harga custom per 1 juta token output. Hanya dipakai saat mode = "fixed_price". */
  outputPriceOverride: numeric("output_price_override", { precision: 20, scale: 10 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => usersTable.id),
});

export type ModelPricingOverride = typeof modelPricingOverridesTable.$inferSelect;
export type ModelPricingOverrideInsert = typeof modelPricingOverridesTable.$inferInsert;
