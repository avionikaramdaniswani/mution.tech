import { Router } from "express";
import { db, projectsTable, deploymentsTable, envVarsTable, coolifyResourcesTable } from "@workspace/db";
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
  syncProjectEnvToCoolify,
  updateCoolifyApplicationSettings,
  getProjectRuntimeLogsWithCoolify,
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
const domainRegex = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
const OptionalDomain = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().trim().toLowerCase().max(1024).refine((val) => {
    return val.split(',').every(d => domainRegex.test(d.trim()));
  }, "Format domain tidak valid").optional(),
);
const ProjectName = z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/);
function isSafeRepoPath(value: string): boolean {
  const segments = value.split("/").filter(Boolean);
  return segments.every((segment) => /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/.test(segment) && segment !== "." && segment !== "..");
}

const BaseDirectoryString = z.string().trim().max(255).refine(isSafeRepoPath, "Path direktori tidak valid");
// undefined = no change (update) / not set (create); null = explicit clear back to repo root
const OptionalBaseDirectory = z.preprocess(
  (value) => value === "" ? null : value,
  z.union([BaseDirectoryString, z.null()]).optional(),
);
const OptionalCommand = z.preprocess(
  (value) => value === "" ? null : value,
  z.union([z.string().trim().max(1024), z.null()]).optional(),
);
const RamTierSchema = z.enum(["256mb", "512mb", "1gb", "2gb", "4gb", "8gb"]);
const RAM_TIER_BYTES: Record<string, number> = {
  "256mb": 256 * 1024 * 1024,
  "512mb": 512 * 1024 * 1024,
  "1gb": 1024 * 1024 * 1024,
  "2gb": 2 * 1024 * 1024 * 1024,
  "4gb": 4 * 1024 * 1024 * 1024,
  "8gb": 8 * 1024 * 1024 * 1024,
};
const CPU_TIER_LIMITS: Record<string, number> = {
  "256mb": 0.5,
  "512mb": 1,
  "1gb": 1,
  "2gb": 2,
  "4gb": 2,
  "8gb": 4,
};

type DockerContainer = {
  Id?: string;
  Names?: string[];
  Labels?: Record<string, string>;
};

function findProjectContainer(
  containers: DockerContainer[],
  applicationUuid: string,
  applicationName?: string | null,
): DockerContainer | undefined {
  const identifiers = [applicationUuid, applicationName]
    .filter((value): value is string => !!value?.trim())
    .map((value) => value.trim());

  return containers.find((container) => {
    const names = container.Names ?? [];
    const labels = container.Labels ?? {};
    const labelCandidates = [
      labels["coolify.name"],
      labels["com.docker.compose.project"],
      labels["com.docker.compose.service"],
    ].filter((value): value is string => !!value);

    return identifiers.some((identifier) =>
      names.some((name) => name === `/${identifier}` || name.startsWith(`/${identifier}-`)) ||
      labelCandidates.some((label) => label === identifier || label.startsWith(`${identifier}-`)),
    );
  });
}

function calculateCpuPercent(stats: any): number {
  const currentCpu = Number(stats.cpu_stats?.cpu_usage?.total_usage ?? 0);
  const previousCpu = Number(stats.precpu_stats?.cpu_usage?.total_usage ?? 0);
  const currentSystem = Number(stats.cpu_stats?.system_cpu_usage ?? 0);
  const previousSystem = Number(stats.precpu_stats?.system_cpu_usage ?? 0);
  const cpuDelta = currentCpu - previousCpu;
  const systemDelta = currentSystem - previousSystem;
  const onlineCpus = Number(stats.cpu_stats?.online_cpus ?? stats.precpu_stats?.online_cpus ?? 1);

  if (cpuDelta <= 0 || systemDelta <= 0) return 0;
  return Math.max(0, (cpuDelta / systemDelta) * onlineCpus * 100);
}

type ProjectMetrics = {
  cpu: number;
  ram: number;
  ramUsageBytes: number;
  ramLimitBytes: number;
};

class ProjectMetricsError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

async function collectProjectMetrics(
  project: typeof projectsTable.$inferSelect,
  resource: typeof coolifyResourcesTable.$inferSelect,
): Promise<ProjectMetrics> {
  if (!resource.coolifyApplicationUuid) {
    throw new ProjectMetricsError("resource_missing", "Project belum memiliki resource aplikasi Coolify.");
  }

  const dockerApiUrl = process.env.DOCKER_API_URL?.trim();
  if (!dockerApiUrl) {
    throw new ProjectMetricsError("docker_not_configured", "DOCKER_API_URL belum dikonfigurasi pada backend.");
  }

  let containersRes: Response;
  try {
    containersRes = await fetch(`${dockerApiUrl}/containers/json`, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new ProjectMetricsError(
      "docker_unreachable",
      `Docker API tidak dapat dihubungi: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  if (!containersRes.ok) {
    throw new ProjectMetricsError("containers_failed", `Docker API containers returned HTTP ${containersRes.status}.`);
  }

  const containers = (await containersRes.json()) as DockerContainer[];
  const appContainer = findProjectContainer(
    containers,
    resource.coolifyApplicationUuid,
    resource.coolifyApplicationName,
  );
  if (!appContainer?.Id) {
    throw new ProjectMetricsError(
      "container_not_found",
      `Container untuk aplikasi ${resource.coolifyApplicationUuid} tidak ditemukan.`,
    );
  }

  let statsRes: Response;
  try {
    statsRes = await fetch(`${dockerApiUrl}/containers/${appContainer.Id}/stats?stream=false`, {
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new ProjectMetricsError(
      "stats_unreachable",
      `Docker stats tidak dapat diambil: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  if (!statsRes.ok) {
    throw new ProjectMetricsError("stats_failed", `Docker stats returned HTTP ${statsRes.status}.`);
  }

  const stats = await statsRes.json() as any;
  const dockerCpuPercent = calculateCpuPercent(stats);
  const cpuLimit = CPU_TIER_LIMITS[project.ramTier as string] || 1;
  const cpuPercent = Math.min(100, dockerCpuPercent / cpuLimit);

  const memoryUsage = Number(stats.memory_stats?.usage ?? 0);
  const inactiveFile = Number(stats.memory_stats?.stats?.inactive_file ?? 0);
  const cache = Number(stats.memory_stats?.stats?.cache ?? 0);
  const ramUsage = Math.max(0, memoryUsage - (inactiveFile || cache));
  const configuredRamLimit = RAM_TIER_BYTES[project.ramTier as string];
  const dockerRamLimit = Number(stats.memory_stats?.limit ?? 0);
  const ramLimit = configuredRamLimit || dockerRamLimit;
  const ramPercent = ramLimit > 0 ? Math.max(0, (ramUsage / ramLimit) * 100) : 0;

  return {
    cpu: Number(cpuPercent.toFixed(2)),
    ram: Number(ramPercent.toFixed(2)),
    ramUsageBytes: ramUsage,
    ramLimitBytes: ramLimit,
  };
}
const CreateProjectBody = z.object({
  name: ProjectName,
  repoUrl: OptionalRepoUrl,
  runtime: RuntimeSchema,
  ramTier: RamTierSchema,
  domain: OptionalDomain,
  baseDirectory: OptionalBaseDirectory,
  buildCommand: OptionalCommand,
  startCommand: OptionalCommand,
});
const UpdateProjectBody = z.object({
  name: ProjectName.optional(),
  repoUrl: OptionalRepoUrl,
  runtime: RuntimeSchema.optional(),
  ramTier: RamTierSchema.optional(),
  domain: OptionalDomain,
  baseDirectory: OptionalBaseDirectory,
  buildCommand: OptionalCommand,
  startCommand: OptionalCommand,
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

const ACTIVE_DEPLOYMENT_STATUSES = new Set(["queued", "building", "deploying"]);

async function resolveProjectStatus(p: typeof projectsTable.$inferSelect): Promise<string> {
  const [latestDeployment] = await db
    .select({ status: deploymentsTable.status })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, p.id))
    .orderBy(desc(deploymentsTable.createdAt))
    .limit(1);

  if (latestDeployment && ACTIVE_DEPLOYMENT_STATUSES.has(latestDeployment.status)) {
    return latestDeployment.status === "queued" ? "deploying" : latestDeployment.status;
  }
  return p.status;
}

function mapProject(p: typeof projectsTable.$inferSelect, effectiveStatus?: string) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    repoUrl: p.repoUrl ?? null,
    runtime: p.runtime,
    status: effectiveStatus ?? p.status,
    ramTier: p.ramTier,
    domain: p.domain ?? null,

    baseDirectory: p.baseDirectory ?? null,
    createdAt: p.createdAt.toISOString(),
    lastDeployedAt: p.lastDeployedAt?.toISOString() ?? null,
    totalSpent: p.totalSpent ?? 0,
  };
}

// List projects
router.get("/projects", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(desc(projectsTable.createdAt));

  const mapped = await Promise.all(
    projects.map(async (project) => {
      const status = await resolveProjectStatus(project);
      return mapProject(project, status);
    })
  );
  res.json(mapped);
});

import { ensureGithubRepoWebhook } from "../lib/github-webhook";

// Create project
router.post("/projects", async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, repoUrl, runtime, ramTier, domain, baseDirectory } = parsed.data;
  const [project] = await db
    .insert(projectsTable)
    .values({
      userId: user.id,
      name,
      repoUrl: repoUrl ?? null,
      runtime,
      ramTier,
      domain: domain ?? null,
      baseDirectory: baseDirectory ?? null,
      status: "idle",
    })
    .returning();

  await logActivity(user.id, "project.created", project.id, { name });

  // Auto-register GitHub push webhook via OAuth token
  void ensureGithubRepoWebhook(project);

  res.status(201).json(mapProject(project));
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

  const status = await resolveProjectStatus(project);
  res.json(mapProject(project, status));
});

// Get project runtime logs
router.get("/projects/:id/runtime-logs", async (req, res): Promise<void> => {
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

  if (!isCoolifyConfigured()) {
    res.status(503).json({ error: "Coolify is not configured" });
    return;
  }

  try {
    const logs = await getProjectRuntimeLogsWithCoolify(project.id);
    res.json({ logs });
  } catch (err) {
    console.error("Error fetching runtime logs:", err);
    res.status(500).json({ error: "Failed to fetch runtime logs" });
  }
});

router.get("/projects/:id/runtime-logs/stream", async (req, res): Promise<void> => {
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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!isCoolifyConfigured()) {
    res.write(`data: ${JSON.stringify({ logs: "Coolify is not configured" })}\n\n`);
    res.end();
    return;
  }

  const fetchLogs = async () => {
    try {
      const logs = await getProjectRuntimeLogsWithCoolify(project.id);
      res.write(`data: ${JSON.stringify({ logs })}\n\n`);
    } catch (err) {
      console.error("Error fetching runtime logs for stream:", err);
      res.write(`data: ${JSON.stringify({ logs: "Failed to fetch runtime logs" })}\n\n`);
    }
  };

  await fetchLogs();
  const interval = setInterval(fetchLogs, 2000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
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

  if (isCoolifyConfigured()) {
    try {
      await updateCoolifyApplicationSettings(project);
    } catch {
      // non-fatal sync error
    }
  }

  res.json(mapProject(project));
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
        error: err instanceof CoolifyError ? err.message : "Gagal menghapus resource deployment",
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
      const stopped = await stopProjectWithCoolify(id);
      if (!stopped) {
        res.status(409).json({ error: "Project belum punya resource deployment. Jalankan deploy dulu." });
        return;
      }
    } catch (err) {
      res.status(err instanceof CoolifyError ? 502 : 500).json({
        error: err instanceof CoolifyError ? err.message : "Gagal menghentikan resource deployment",
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
  res.json(mapProject(project));
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
      const restarted = await restartProjectWithCoolify(id);
      if (!restarted) {
        res.status(409).json({ error: "Project belum punya resource deployment. Jalankan deploy dulu." });
        return;
      }
    } catch (err) {
      res.status(err instanceof CoolifyError ? 502 : 500).json({
        error: err instanceof CoolifyError ? err.message : "Gagal me-restart resource deployment",
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
  res.json(mapProject(project));
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
      value: v.value,
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

  // Sync updated environment variables to Coolify
  if (isCoolifyConfigured()) {
    try {
      await syncProjectEnvToCoolify(project);
    } catch {
      // Ignore sync error if resource doesn't exist on Coolify yet
    }
  }

  res.json({
    id: envVar.id,
    projectId: envVar.projectId,
    key: envVar.key,
    value: envVar.value,
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

  // Sync environment variables to Coolify after deletion
  if (isCoolifyConfigured()) {
    try {
      await syncProjectEnvToCoolify(project);
    } catch {
      // Ignore sync error if resource doesn't exist on Coolify yet
    }
  }

  res.json({ success: true });
});

router.get("/projects/:id/metrics/current", async (req, res): Promise<void> => {
  const projectId = parseRouteId(req.params.id);
  const userId = (req as any).user!.id;
  if (projectId === null) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [resource] = await db
    .select()
    .from(coolifyResourcesTable)
    .where(eq(coolifyResourcesTable.projectId, projectId));
  if (!resource) {
    res.status(503).json({ unavailable: true, code: "resource_missing", error: "Resource aplikasi belum tersedia." });
    return;
  }

  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await collectProjectMetrics(project, resource));
  } catch (error) {
    const code = error instanceof ProjectMetricsError ? error.code : "metrics_failed";
    const message = error instanceof Error ? error.message : "Unknown metrics error";
    console.error(`Failed to collect metrics for project ${projectId} [${code}]:`, error);
    res.status(503).json({ unavailable: true, code, error: message });
  }
});

router.get("/projects/:id/metrics", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = (req as any).user!.id;
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
    
    if (!project) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [resource] = await db
      .select()
      .from(coolifyResourcesTable)
      .where(eq(coolifyResourcesTable.projectId, projectId));
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!resource) {
      res.write(`data: ${JSON.stringify({ cpu: 0, ram: 0, unavailable: true })}\n\n`);
      res.end();
      return;
    }

    const fetchMetrics = async () => {
      try {
        const result = await collectProjectMetrics(project, resource);
        res.write(`data: ${JSON.stringify(result)}\n\n`);
      } catch (err) {
        console.error("Failed to fetch metrics from Docker API:", err);
        res.write(`data: ${JSON.stringify({ cpu: 0, ram: 0, unavailable: true })}\n\n`);
      }
    };

    let timeout: NodeJS.Timeout | undefined;
    let closed = false;
    const pollMetrics = async () => {
      await fetchMetrics();
      if (!closed) timeout = setTimeout(pollMetrics, 2_000);
    };
    void pollMetrics();

    res.on("close", () => {
      closed = true;
      if (timeout) clearTimeout(timeout);
    });

  } catch (err) {
    console.error("SSE Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.end();
    }
  }
});

export default router;
