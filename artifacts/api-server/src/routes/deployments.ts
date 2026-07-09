import { Router } from "express";
import { db, deploymentsTable, projectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { logActivity } from "../lib/activity";
import {
  CoolifyError,
  deployProjectWithCoolify,
  formatCoolifyBuildLog,
  isCoolifyConfigured,
  sanitizeDeploymentProviderText,
  syncDeploymentFromCoolify,
} from "../lib/coolify";
import { logger } from "../lib/logger";

const router = Router();

router.use(requireAuth);

const TriggerDeploymentBody = z.object({
  commitHash: z.string().trim().regex(/^[a-f0-9]{7,40}$/i).optional(),
  commitMessage: z.string().trim().max(500).optional(),
});

function parseRouteId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

type SyncedDeploymentStatus = NonNullable<Awaited<ReturnType<typeof syncDeploymentFromCoolify>>>["status"];

function toProjectStatus(status: SyncedDeploymentStatus): "idle" | "running" | "stopped" | "building" | "deploying" | "failed" {
  if (status === "queued") return "deploying";
  if (status === "rolled_back") return "running";
  return status;
}

async function refreshDeploymentStatus(d: typeof deploymentsTable.$inferSelect): Promise<typeof deploymentsTable.$inferSelect> {
  if (!isCoolifyConfigured()) return d;

  try {
    const synced = await syncDeploymentFromCoolify(d.id);
    if (!synced) return d;

    const shouldSetDeployedAt = ["running", "failed", "stopped"].includes(synced.status) && !d.deployedAt;
    const [updated] = await db
      .update(deploymentsTable)
      .set({
        status: synced.status,
        buildLog: synced.logs ?? d.buildLog,
        deployedAt: shouldSetDeployedAt ? new Date() : d.deployedAt,
      })
      .where(eq(deploymentsTable.id, d.id))
      .returning();

    await db
      .update(projectsTable)
      .set({
        status: toProjectStatus(synced.status),
        lastDeployedAt: shouldSetDeployedAt ? new Date() : undefined,
      })
      .where(eq(projectsTable.id, d.projectId));

    return updated ?? d;
  } catch {
    return d;
  }
}

function deploymentErrorLog(err: unknown): string {
  const message = err instanceof CoolifyError ? err.message : (err as Error)?.message || "Deployment gagal";
  return `[${new Date().toISOString()}] Deployment gagal diproses\n${sanitizeDeploymentProviderText(message)}`;
}

// List deployments
router.get("/projects/:id/deployments", async (req, res): Promise<void> => {
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

  const deployments = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, id))
    .orderBy(desc(deploymentsTable.createdAt));

  const refreshed = await Promise.all(
    deployments.map((deployment, index) => index < 10 ? refreshDeploymentStatus(deployment) : deployment),
  );
  res.json(refreshed.map(mapDeployment));
});

// Trigger deployment
router.post("/projects/:id/deployments", async (req, res): Promise<void> => {
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

  const body = TriggerDeploymentBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Metadata deployment tidak valid" });
    return;
  }
  const commitHash = body.data.commitHash ?? generateFakeHash();
  const commitMessage = body.data.commitMessage ?? "Manual deploy";

  const [deployment] = await db
    .insert(deploymentsTable)
    .values({
      projectId: id,
      status: isCoolifyConfigured() ? "queued" : "running",
      commitHash,
      commitMessage,
      buildLog: isCoolifyConfigured() ? "Deployment masuk antrean Mution." : FAKE_BUILD_LOG,
      deployedAt: isCoolifyConfigured() ? null : new Date(),
      durationMs: isCoolifyConfigured() ? null : Math.floor(Math.random() * 20000) + 15000,
    })
    .returning();

  if (!isCoolifyConfigured()) {
    await db
      .update(projectsTable)
      .set({ status: "running", lastDeployedAt: deployment.deployedAt })
      .where(eq(projectsTable.id, id));

    await logActivity(user.id, "deployment.triggered", id, { commitHash, commitMessage, provider: "simulated" });
    res.status(201).json(mapDeployment(deployment));
    return;
  }

  await db
    .update(projectsTable)
    .set({ status: "deploying" })
    .where(eq(projectsTable.id, id));

  try {
    const result = await deployProjectWithCoolify(project, deployment.id);
    const [updated] = await db
      .update(deploymentsTable)
      .set({
        status: "deploying",
        buildLog: formatCoolifyBuildLog({
          message: result.message,
          applicationUuid: result.applicationUuid,
          deploymentUuid: result.deploymentUuid,
        }),
      })
      .where(eq(deploymentsTable.id, deployment.id))
      .returning();

    await logActivity(user.id, "deployment.triggered", id, {
      commitHash,
      commitMessage,
      provider: "mution-deployment",
      deploymentRunId: result.deploymentUuid,
    });

    res.status(201).json(mapDeployment(updated ?? deployment));
  } catch (err) {
    logger.error(
      {
        err,
        projectId: id,
        deploymentId: deployment.id,
        coolifyStatusCode: err instanceof CoolifyError ? err.statusCode : undefined,
      },
      "Deployment provider failed",
    );

    const [failed] = await db
      .update(deploymentsTable)
      .set({
        status: "failed",
        buildLog: deploymentErrorLog(err),
        deployedAt: new Date(),
      })
      .where(eq(deploymentsTable.id, deployment.id))
      .returning();

    await db
      .update(projectsTable)
      .set({ status: "failed" })
      .where(eq(projectsTable.id, id));

    res.status(err instanceof CoolifyError ? 502 : 500).json({
      error: err instanceof CoolifyError
        ? sanitizeDeploymentProviderText(err.message)
        : "Deployment gagal diproses",
      deployment: mapDeployment(failed ?? deployment),
    });
  }
});

// Get deployment
router.get("/projects/:id/deployments/:deploymentId", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseRouteId(req.params.id);
  const deploymentId = parseRouteId(req.params.deploymentId);
  if (id === null || deploymentId === null) { res.status(400).json({ error: "Invalid id" }); return; }

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

  const refreshed = await refreshDeploymentStatus(deployment);
  res.json(mapDeployment(refreshed));
});

// Rollback
router.post("/projects/:id/deployments/:deploymentId/rollback", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseRouteId(req.params.id);
  const deploymentId = parseRouteId(req.params.deploymentId);
  if (id === null || deploymentId === null) { res.status(400).json({ error: "Invalid id" }); return; }

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
