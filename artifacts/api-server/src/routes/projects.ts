import { Router } from "express";
import { db, projectsTable, deploymentsTable, envVarsTable, projectDatabasesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { logActivity } from "../lib/activity";
import {
  CoolifyError,
  deleteProjectWithCoolify,
  isCoolifyConfigured,
  restartProjectWithCoolify,
  stopProjectWithCoolify,
} from "../lib/coolify";

const router = Router();

router.use(requireAuth);

const RuntimeSchema = z.enum(["nodejs", "python", "php", "static"]);
const OptionalRepoUrl = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().trim().url().max(2048).refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }).optional(),
);
const OptionalDomain = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().trim().toLowerCase().max(253).regex(/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/).optional(),
);
const ProjectName = z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/);
const CreateProjectBody = z.object({
  name: ProjectName,
  repoUrl: OptionalRepoUrl,
  runtime: RuntimeSchema,
  domain: OptionalDomain,
});
const UpdateProjectBody = z.object({
  name: ProjectName.optional(),
  repoUrl: OptionalRepoUrl,
  runtime: RuntimeSchema.optional(),
  domain: OptionalDomain,
}).refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan");
const SetProjectEnvBody = z.object({
  key: z.string().trim().min(1).max(128).regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  value: z.string().max(8192),
});

function parseRouteId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (isCoolifyConfigured()) {
    try {
      await deleteProjectWithCoolify(id);
    } catch (err) {
      res.status(err instanceof CoolifyError ? 502 : 500).json({
        error: err instanceof CoolifyError ? err.message : "Gagal menghapus resource di Coolify",
      });
      return;
    }
  }

  await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  await logActivity(user.id, "project.deleted", undefined, { name: project.name });
  res.json({ success: true });
});

// Stop project
router.post("/projects/:id/stop", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existingProject] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)))
    .limit(1);

  if (!existingProject) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (isCoolifyConfigured()) {
    try {
      await stopProjectWithCoolify(id);
    } catch (err) {
      res.status(err instanceof CoolifyError ? 502 : 500).json({
        error: err instanceof CoolifyError ? err.message : "Gagal menghentikan resource di Coolify",
      });
      return;
    }
  }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existingProject] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)))
    .limit(1);

  if (!existingProject) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (isCoolifyConfigured()) {
    try {
      await restartProjectWithCoolify(id);
    } catch (err) {
      res.status(err instanceof CoolifyError ? 502 : 500).json({
        error: err instanceof CoolifyError ? err.message : "Gagal me-restart resource di Coolify",
      });
      return;
    }
  }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
  const id = parseRouteId(req.params.id);
  const envId = parseRouteId(req.params.envId);
  if (id === null || envId === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
  const id = parseRouteId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
