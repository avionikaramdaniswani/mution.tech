import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const changelogsTable = pgTable("changelogs", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  changes: jsonb("changes").$type<{ type: "feat" | "fix" | "chore"; text: string }[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChangelogSchema = createInsertSchema(changelogsTable);
export const selectChangelogSchema = createSelectSchema(changelogsTable);
export type Changelog = typeof changelogsTable.$inferSelect;
export type NewChangelog = typeof changelogsTable.$inferInsert;
