import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const otpVerificationsTable = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OtpVerification = typeof otpVerificationsTable.$inferSelect;
