import { Router } from "express";
import { db, deploymentsTable, projectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  TriggerDeploymentBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router = Router();

router.use(requireAuth);

const FAKE_BUILD_LOG = `[2024-01-01 00:00:00] Cloning repository...
[2024-01-01 00:00:02] Repository cloned successfully
[2024-01-01 00:00:02] Installing dependencies...
[2024-01-01 00:00:15] Dependencies installed
[2024-01-01 00:00:15] Building application...
[2024-01-01 00:00:28] Build successful
[2024-01-01 00:00:28] Creating container image...
[2024-01-01 00:00:35] Container image created
[2024-01-01 00:00:35] Deploying container...
[2024-01-01 00:00:38] Container deployed successfully
[2024-01-01 00:00:38] Health check passed
[2024-01-01 00:00:38] Deployment complete!`;

function mapDeployment(d: typeof deploymentsTable.$inferSelect) {
  return {
    id: d.id,
    projectId: d.projectId,
    status: d.status,
    commitHash: d.commitHash ?? null,
    commitMessage: d.commitMessage ?? null,
    buildLog: d.buildLog ?? null,
    createdAt: d.createdAt.toISOString(),
    deployedAt: d.deployedAt?.toISOString() ?? null,
    durationMs: d.durationMs ?? null,
  };
}

// List deployments
router.get("/projects/:id/deployments", async (req, res): Promise<void> => {
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

  const deployments = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, id))
    .orderBy(desc(deploymentsTable.createdAt));

  res.json(deployments.map(mapDeployment));
});

// Trigger deployment
router.post("/projects/:id/deployments", async (req, res): Promise<void> => {
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

  const body = TriggerDeploymentBody.safeParse(req.body ?? {});
  const commitHash = body.success ? (body.data.commitHash ?? generateFakeHash()) : generateFakeHash();
  const commitMessage = body.success ? (body.data.commitMessage ?? "Manual deploy") : "Manual deploy";

  const deployedAt = new Date();
  const durationMs = Math.floor(Math.random() * 20000) + 15000;

  const [deployment] = await db
    .insert(deploymentsTable)
    .values({
      projectId: id,
      status: "running",
      commitHash,
      commitMessage,
      buildLog: FAKE_BUILD_LOG,
      deployedAt,
      durationMs,
    })
    .returning();

  // Update project status
  await db
    .update(projectsTable)
    .set({ status: "running", lastDeployedAt: deployedAt })
    .where(eq(projectsTable.id, id));

  await logActivity(user.id, "deployment.triggered", id, { commitHash, commitMessage });

  res.status(201).json(mapDeployment(deployment));
});

// Get deployment
router.get("/projects/:id/deployments/:deploymentId", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawDep = Array.isArray(req.params.deploymentId) ? req.params.deploymentId[0] : req.params.deploymentId;
  const id = parseInt(raw, 10);
  const deploymentId = parseInt(rawDep, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(and(eq(deploymentsTable.id, deploymentId), eq(deploymentsTable.projectId, id)));

  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  res.json(mapDeployment(deployment));
});

// Rollback
router.post("/projects/:id/deployments/:deploymentId/rollback", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawDep = Array.isArray(req.params.deploymentId) ? req.params.deploymentId[0] : req.params.deploymentId;
  const id = parseInt(raw, 10);
  const deploymentId = parseInt(rawDep, 10);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [original] = await db
    .select()
    .from(deploymentsTable)
    .where(and(eq(deploymentsTable.id, deploymentId), eq(deploymentsTable.projectId, id)));

  if (!original) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  const deployedAt = new Date();
  const [newDeployment] = await db
    .insert(deploymentsTable)
    .values({
      projectId: id,
      status: "running",
      commitHash: original.commitHash,
      commitMessage: `Rollback to ${original.commitHash?.slice(0, 7) ?? "previous"}`,
      buildLog: FAKE_BUILD_LOG,
      deployedAt,
      durationMs: Math.floor(Math.random() * 10000) + 8000,
    })
    .returning();

  await db
    .update(projectsTable)
    .set({ status: "running", lastDeployedAt: deployedAt })
    .where(eq(projectsTable.id, id));

  await logActivity(user.id, "deployment.rollback", id, { originalDeploymentId: deploymentId });

  res.status(201).json(mapDeployment(newDeployment));
});

function generateFakeHash(): string {
  return Math.random().toString(16).slice(2, 9);
}

export default router;
