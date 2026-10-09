import { pgTable, serial, integer, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { announcementsTable } from "./announcements";

export const announcementReactionsTable = pgTable("announcement_reactions", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcementsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  unq: unique().on(table.announcementId, table.userId, table.emoji),
}));

export type AnnouncementReaction = typeof announcementReactionsTable.$inferSelect;
export type InsertAnnouncementReaction = typeof announcementReactionsTable.$inferInsert;
