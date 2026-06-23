import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projectsTable } from "./projects";

export const dbStatusEnum = pgEnum("db_status", ["provisioning", "ready", "error"]);

export const projectDatabasesTable = pgTable("project_databases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .unique()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("postgresql"),
  connectionString: text("connection_string"),
  sizeMb: integer("size_mb").notNull().default(0),
  status: dbStatusEnum("status").notNull().default("provisioning"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectDatabaseSchema = createInsertSchema(projectDatabasesTable).omit({ id: true, createdAt: true });
export type InsertProjectDatabase = z.infer<typeof insertProjectDatabaseSchema>;
export type ProjectDatabase = typeof projectDatabasesTable.$inferSelect;
