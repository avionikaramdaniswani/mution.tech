import { Router } from "express";
import { db, projectsTable, deploymentsTable, envVarsTable, projectDatabasesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  GetProjectEnvParams,
  SetProjectEnvParams,
  SetProjectEnvBody,
  DeleteProjectEnvParams,
  StopProjectParams,
  RestartProjectParams,
  GetProjectDatabaseParams,
  ProvisionDatabaseParams,
  DeleteDatabaseParams,
  CreateProjectBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router = Router();

router.use(requireAuth);

// List projects
router.get("/projects", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(desc(projectsTable.createdAt));

  res.json(
    projects.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      repoUrl: p.repoUrl ?? null,
      runtime: p.runtime,
      status: p.status,
      domain: p.domain ?? null,
      createdAt: p.createdAt.toISOString(),
      lastDeployedAt: p.lastDeployedAt?.toISOString() ?? null,
    }))
  );
});

// Create project
router.post("/projects", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, repoUrl, runtime, domain } = parsed.data;
  const [project] = await db
    .insert(projectsTable)
    .values({
      userId: user.id,
      name,
      repoUrl: repoUrl ?? null,
      runtime,
      domain: domain ?? null,
      status: "idle",
    })
    .returning();

  await logActivity(user.id, "project.created", project.id, { name });

  res.status(201).json({
    id: project.id,
    userId: project.userId,
    name: project.name,
    repoUrl: project.repoUrl ?? null,
    runtime: project.runtime,
    status: project.status,
    domain: project.domain ?? null,
    createdAt: project.createdAt.toISOString(),
    lastDeployedAt: null,
  });
});

// Get project
router.get("/projects/:id", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    id: project.id,
    userId: project.userId,
    name: project.name,
    repoUrl: project.repoUrl ?? null,
    runtime: project.runtime,
    status: project.status,
    domain: project.domain ?? null,
    createdAt: project.createdAt.toISOString(),
    lastDeployedAt: project.lastDeployedAt?.toISOString() ?? null,
  });
});

// Update project
router.patch("/projects/:id", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    id: project.id,
    userId: project.userId,
    name: project.name,
    repoUrl: project.repoUrl ?? null,
    runtime: project.runtime,
    status: project.status,
    domain: project.domain ?? null,
    createdAt: project.createdAt.toISOString(),
    lastDeployedAt: project.lastDeployedAt?.toISOString() ?? null,
  });
});

// Delete project
router.delete("/projects/:id", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(user.id, "project.deleted", undefined, { name: project.name });
  res.json({ success: true });
});

// Stop project
router.post("/projects/:id/stop", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .update(projectsTable)
    .set({ status: "stopped" })
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(user.id, "project.stopped", id, { name: project.name });
  res.json({
    id: project.id,
    userId: project.userId,
    name: project.name,
    repoUrl: project.repoUrl ?? null,
    runtime: project.runtime,
    status: project.status,
    domain: project.domain ?? null,
    createdAt: project.createdAt.toISOString(),
    lastDeployedAt: project.lastDeployedAt?.toISOString() ?? null,
  });
});

// Restart project
router.post("/projects/:id/restart", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .update(projectsTable)
    .set({ status: "running" })
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(user.id, "project.restarted", id, { name: project.name });
  res.json({
    id: project.id,
    userId: project.userId,
    name: project.name,
    repoUrl: project.repoUrl ?? null,
    runtime: project.runtime,
    status: project.status,
    domain: project.domain ?? null,
    createdAt: project.createdAt.toISOString(),
    lastDeployedAt: project.lastDeployedAt?.toISOString() ?? null,
  });
});

// Env vars
router.get("/projects/:id/env", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const vars = await db
    .select()
    .from(envVarsTable)
    .where(eq(envVarsTable.projectId, id))
    .orderBy(envVarsTable.key);

  res.json(
    vars.map((v) => ({
      id: v.id,
      projectId: v.projectId,
      key: v.key,
      value: "***",
      createdAt: v.createdAt.toISOString(),
    }))
  );
});

router.post("/projects/:id/env", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = SetProjectEnvBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { key, value } = parsed.data;

  // Upsert: delete existing key first
  await db.delete(envVarsTable).where(and(eq(envVarsTable.projectId, id), eq(envVarsTable.key, key)));
  const [envVar] = await db
    .insert(envVarsTable)
    .values({ projectId: id, key, value })
    .returning();

  res.json({
    id: envVar.id,
    projectId: envVar.projectId,
    key: envVar.key,
    value: "***",
    createdAt: envVar.createdAt.toISOString(),
  });
});

router.delete("/projects/:id/env/:envId", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawEnvId = Array.isArray(req.params.envId) ? req.params.envId[0] : req.params.envId;
  const id = parseInt(rawId, 10);
  const envId = parseInt(rawEnvId, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(envVarsTable).where(and(eq(envVarsTable.id, envId), eq(envVarsTable.projectId, id)));
  res.json({ success: true });
});

// Database
router.get("/projects/:id/database", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [database] = await db
    .select()
    .from(projectDatabasesTable)
    .where(eq(projectDatabasesTable.projectId, id));

  if (!database) {
    res.status(404).json({ error: "No database provisioned" });
    return;
  }

  res.json({
    id: database.id,
    projectId: database.projectId,
    type: database.type,
    connectionString: database.connectionString ? "postgresql://***:***@host:5432/db" : null,
    sizeMb: database.sizeMb,
    status: database.status,
    createdAt: database.createdAt.toISOString(),
  });
});

router.post("/projects/:id/database", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectDatabasesTable)
    .where(eq(projectDatabasesTable.projectId, id));

  if (existing) {
    res.status(409).json({ error: "Database already provisioned" });
    return;
  }

  // Simulate provisioning
  const fakeConn = `postgresql://user_${id}:pass_${Math.random().toString(36).slice(2)}@db.paas.local:5432/project_${id}`;
  const [database] = await db
    .insert(projectDatabasesTable)
    .values({
      projectId: id,
      type: "postgresql",
      connectionString: fakeConn,
      sizeMb: 0,
      status: "ready",
    })
    .returning();

  await logActivity(user.id, "database.provisioned", id, { type: "postgresql" });

  res.status(201).json({
    id: database.id,
    projectId: database.projectId,
    type: database.type,
    connectionString: "postgresql://***:***@host:5432/db",
    sizeMb: database.sizeMb,
    status: database.status,
    createdAt: database.createdAt.toISOString(),
  });
});

router.delete("/projects/:id/database", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(projectDatabasesTable).where(eq(projectDatabasesTable.projectId, id));
  await logActivity(user.id, "database.deleted", id);
  res.json({ success: true });
});

export default router;
