import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const creditPackagesTable = pgTable("credit_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  /** Harga dalam IDR (Rupiah) yang dibayar user */
  priceIdr: integer("price_idr").notNull(),
  /** Jumlah kredit yang diterima user (bisa lebih dari priceIdr karena bonus) */
  creditsAmount: integer("credits_amount").notNull(),
  /** Label bonus opsional, misal "+12% bonus" — tampil di UI */
  bonusLabel: text("bonus_label"),
  /** Harga asli sebelum diskon (untuk efek coret di UI) */
  originalPriceIdr: integer("original_price_idr"),
  /** Jika true, paket ini akan dihighlight ala Flash Sale */
  isHighlight: boolean("is_highlight").notNull().default(false),
  /** Stok paket. Jika null berarti stok tidak terbatas */
  stock: integer("stock"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CreditPackage = typeof creditPackagesTable.$inferSelect;
export type CreditPackageInsert = typeof creditPackagesTable.$inferInsert;
