import { pgTable, serial, text, integer, bigint, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const tokenPackagesTable = pgTable("token_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'claude' | 'gpt'
  description: text("description"),
  tokensAmount: bigint("tokens_amount", { mode: "number" }).notNull(),
  priceIdr: integer("price_idr").notNull(),
  originalPriceIdr: integer("original_price_idr"),
  durationDays: integer("duration_days").notNull().default(30),
  bonusLabel: text("bonus_label"),
  isHighlight: boolean("is_highlight").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userTokenPackagesTable = pgTable("user_token_packages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  packageId: integer("package_id").references(() => tokenPackagesTable.id, { onDelete: "set null" }),
  orderId: integer("order_id"),
  category: text("category").notNull(), // 'claude' | 'gpt'
  totalTokens: bigint("total_tokens", { mode: "number" }).notNull(),
  remainingTokens: bigint("remaining_tokens", { mode: "number" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TokenPackage = typeof tokenPackagesTable.$inferSelect;
export type TokenPackageInsert = typeof tokenPackagesTable.$inferInsert;
export type UserTokenPackage = typeof userTokenPackagesTable.$inferSelect;
export type UserTokenPackageInsert = typeof userTokenPackagesTable.$inferInsert;
