import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const runtimeEnum = pgEnum("runtime", ["nodejs", "python", "php", "static"]);
export const projectStatusEnum = pgEnum("project_status", [
  "idle",
  "running",
  "stopped",
  "building",
  "deploying",
  "failed",
]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  repoUrl: text("repo_url"),
  runtime: runtimeEnum("runtime").notNull(),
  status: projectStatusEnum("status").notNull().default("idle"),
  domain: text("domain"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastDeployedAt: timestamp("last_deployed_at"),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
