import { pgTable, text, serial, integer, timestamp, pgEnum, real } from "drizzle-orm/pg-core";
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

export const ramTierEnum = pgEnum("ram_tier", [
  "256mb",
  "512mb",
  "1gb",
  "2gb",
  "4gb",
  "8gb",
]);

export const TIER_PRICING: Record<string, { ram: string; perMinute: number }> = {
  "256mb": { ram: "256 MB", perMinute: 0.25 },
  "512mb": { ram: "512 MB", perMinute: 0.49 },
  "1gb": { ram: "1 GB", perMinute: 0.9 },
  "2gb": { ram: "2 GB", perMinute: 1.8 },
  "4gb": { ram: "4 GB", perMinute: 3.6 },
  "8gb": { ram: "8 GB", perMinute: 7.2 },
};

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  repoUrl: text("repo_url"),
  runtime: runtimeEnum("runtime").notNull(),
  status: projectStatusEnum("status").notNull().default("idle"),
  ramTier: ramTierEnum("ram_tier").notNull().default("256mb"),
  domain: text("domain"),
  baseDirectory: text("base_directory"),
  buildCommand: text("build_command"),
  startCommand: text("start_command"),
  totalSpent: real("total_spent").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastDeployedAt: timestamp("last_deployed_at"),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, totalSpent: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
