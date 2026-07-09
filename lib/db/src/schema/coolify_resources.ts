import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { deploymentsTable } from "./deployments";

export const coolifyResourcesTable = pgTable("coolify_resources", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .unique()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  coolifyProjectUuid: text("coolify_project_uuid").notNull(),
  coolifyEnvironmentName: text("coolify_environment_name").notNull().default("production"),
  coolifyEnvironmentUuid: text("coolify_environment_uuid"),
  coolifyServerUuid: text("coolify_server_uuid").notNull(),
  coolifyApplicationUuid: text("coolify_application_uuid"),
  coolifyApplicationName: text("coolify_application_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const coolifyDeploymentsTable = pgTable("coolify_deployments", {
  id: serial("id").primaryKey(),
  deploymentId: integer("deployment_id")
    .notNull()
    .unique()
    .references(() => deploymentsTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  coolifyDeploymentUuid: text("coolify_deployment_uuid").notNull(),
  coolifyApplicationUuid: text("coolify_application_uuid").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CoolifyResource = typeof coolifyResourcesTable.$inferSelect;
export type CoolifyDeployment = typeof coolifyDeploymentsTable.$inferSelect;
