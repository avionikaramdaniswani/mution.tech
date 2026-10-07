import { boolean, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // 'info', 'warning', 'urgent', 'promo'
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Announcement = typeof announcementsTable.$inferSelect;
export type InsertAnnouncement = typeof announcementsTable.$inferInsert;
