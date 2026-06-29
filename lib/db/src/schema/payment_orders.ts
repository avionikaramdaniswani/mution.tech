import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "expired", "failed"]);

export const paymentOrdersTable = pgTable("payment_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: integer("amount").notNull(),
  creditsAmount: integer("credits_amount").notNull().default(0),
  provider: text("provider").notNull().default("tripay"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paymentUrl: text("payment_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export type PaymentOrder = typeof paymentOrdersTable.$inferSelect;
