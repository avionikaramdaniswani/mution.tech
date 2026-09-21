import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "expired", "failed", "cancelled"]);

export const paymentOrdersTable = pgTable("payment_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: integer("amount").notNull(),
  creditsAmount: integer("credits_amount").notNull().default(0),
  provider: text("provider").notNull().default("duitku"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paymentUrl: text("payment_url"),
  payCode: text("pay_code"), // Virtual Account number or payment code
  qrString: text("qr_string"), // Raw QR string for QRIS
  tripayReference: text("tripay_reference"), // Legacy: TriPay's own reference (DEV-xxx / T-xxx), kept for backward compat
  duitkuReference: text("duitku_reference"), // Duitku's reference ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export type PaymentOrder = typeof paymentOrdersTable.$inferSelect;
