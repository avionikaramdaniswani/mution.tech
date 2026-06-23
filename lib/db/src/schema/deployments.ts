import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "queued",
  "building",
  "deploying",
  "running",
  "failed",
  "stopped",
  "rolled_back",
]);

export const deploymentsTable = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  status: deploymentStatusEnum("status").notNull().default("queued"),
  commitHash: text("commit_hash"),
  commitMessage: text("commit_message"),
  buildLog: text("build_log"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deployedAt: timestamp("deployed_at"),
  durationMs: integer("duration_ms"),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({ id: true, createdAt: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
