import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const changelogChangeTypeSchema = z.enum(["feat", "fix", "chore"]);
export type ChangelogChangeType = z.infer<typeof changelogChangeTypeSchema>;

export const changelogChangeSchema = z.object({
  type: changelogChangeTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
});

export type ChangelogChange = z.infer<typeof changelogChangeSchema>;

export const changelogsTable = pgTable("changelogs", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  changes: jsonb("changes").$type<ChangelogChange[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChangelogSchema = createInsertSchema(changelogsTable, {
  changes: z.array(changelogChangeSchema).min(1),
});
export const selectChangelogSchema = createSelectSchema(changelogsTable);
export type Changelog = typeof changelogsTable.$inferSelect;
export type NewChangelog = typeof changelogsTable.$inferInsert;
