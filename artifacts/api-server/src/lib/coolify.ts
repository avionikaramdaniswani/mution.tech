import { eq } from "drizzle-orm";
import {
  coolifyDeploymentsTable,
  coolifyResourcesTable,
  db,
  envVarsTable,
  type Project,
} from "@workspace/db";
import { ensureCoolifyTables } from "./coolify-schema";

type Runtime = "nodejs" | "python" | "php" | "static";
type DeploymentStatus = "queued" | "building" | "deploying" | "running" | "failed" | "stopped" | "rolled_back";

type CoolifyServer = {
  uuid?: string;
  name?: string;
  ip?: string;
  description?: string | null;
};

type CoolifyProject = {
  uuid: string;
  name?: string;
};

type CoolifyEnvironment = {
  uuid?: string;
  name?: string;
};

type CoolifyApplication = {
  uuid: string;
  name?: string;
};

type CoolifyDeploymentResponse = {
  deployment_uuid?: string;
  uuid?: string;
  message?: string;
};

type CoolifyDeploymentDetails = {
  status?: string;
  logs?: string;
  created_at?: string;
  updated_at?: string;
};

type CoolifyConfig = {
  apiBase: string;
  apiToken: string;
  serverUuid?: string;
  serverName: string;
  serverIp?: string;
  environmentName: string;
  projectPrefix: string;
  githubAppUuid?: string;
  sourceMode: "public" | "github-app";
};

export class CoolifyError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "CoolifyError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

let cachedServerUuid: string | null = null;

export function isCoolifyConfigured(): boolean {
  return !!process.env.COOLIFY_API_URL?.trim() && !!process.env.COOLIFY_API_TOKEN?.trim();
}

function getCoolifyConfig(): CoolifyConfig {
  const apiUrl = process.env.COOLIFY_API_URL?.trim();
  const apiToken = process.env.COOLIFY_API_TOKEN?.trim();

  if (!apiUrl || !apiToken) {
    throw new CoolifyError("Coolify belum dikonfigurasi. Set COOLIFY_API_URL dan COOLIFY_API_TOKEN di Heroku Config Vars.");
  }

  const trimmed = apiUrl.replace(/\/+$/, "");
  const apiBase = trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  const githubAppUuid = process.env.COOLIFY_GITHUB_APP_UUID?.trim() || undefined;
  const sourceMode = (process.env.COOLIFY_SOURCE_MODE?.trim() === "github-app" || githubAppUuid)
    ? "github-app"
    : "public";

  return {
    apiBase,
    apiToken,
    serverUuid: process.env.COOLIFY_SERVER_UUID?.trim() || undefined,
    serverName: process.env.COOLIFY_SERVER_NAME?.trim() || "Mution Server B",
    serverIp: process.env.COOLIFY_SERVER_IP?.trim() || undefined,
    environmentName: process.env.COOLIFY_ENVIRONMENT_NAME?.trim() || "production",
    projectPrefix: process.env.COOLIFY_PROJECT_PREFIX?.trim() || "mution",
    githubAppUuid,
    sourceMode,
  };
}

async function coolifyRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  search?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const config = getCoolifyConfig();
  const url = new URL(`${config.apiBase}${path}`);
  for (const [key, value] of Object.entries(search ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.apiToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    const parsed = parseResponseBody(text);

    if (!res.ok) {
      const message = getErrorMessage(parsed) ?? `Coolify API request failed with status ${res.status}`;
      throw new CoolifyError(message, res.status, parsed);
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof CoolifyError) throw err;
    if ((err as any)?.name === "AbortError") {
      throw new CoolifyError("Coolify API timeout. Cek koneksi dari Heroku ke server Coolify.");
    }
    throw new CoolifyError((err as Error).message || "Coolify API request failed");
  } finally {
    clearTimeout(timeout);
  }
}

function parseResponseBody(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.errors === "object") return JSON.stringify(obj.errors);
  return null;
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return slug || fallback;
}

function coolifyProjectName(project: Project): string {
  const prefix = getCoolifyConfig().projectPrefix;
  return slugify(`${prefix}-${project.userId}-${project.id}-${project.name}`, `project-${project.id}`);
}

function coolifyApplicationName(project: Project): string {
  const prefix = getCoolifyConfig().projectPrefix;
  return slugify(`${prefix}-app-${project.userId}-${project.id}-${project.name}`, `app-${project.id}`);
}

function normalizeRepoUrl(repoUrl: string): string {
  return repoUrl.trim();
}

function normalizeDomain(domain: string | null): string | undefined {
  if (!domain) return undefined;
  const clean = domain.trim().toLowerCase();
  if (!clean) return undefined;
  return clean.startsWith("http://") || clean.startsWith("https://") ? clean : `https://${clean}`;
}

function runtimeBuildPack(runtime: Runtime): "nixpacks" | "static" {
  return runtime === "static" ? "static" : "nixpacks";
}

function runtimePort(runtime: Runtime): string {
  const envKey = `COOLIFY_${runtime.toUpperCase()}_PORT`;
  const configured = process.env[envKey]?.trim() || process.env.COOLIFY_DEFAULT_PORT?.trim();
  if (configured) return configured;
  if (runtime === "python") return "8000";
  if (runtime === "php" || runtime === "static") return "80";
  return "3000";
}

function buildApplicationEnv(runtime: Runtime, rows: Array<{ key: string; value: string }>): Array<{ key: string; value: string }> {
  const env = rows.map((row) => ({ key: row.key, value: row.value }));
  if ((runtime === "nodejs" || runtime === "python") && !env.some((row) => row.key === "PORT")) {
    env.push({ key: "PORT", value: runtimePort(runtime) });
  }
  return env;
}

function mapCoolifyDeploymentStatus(status: string | undefined): DeploymentStatus {
  const normalized = (status ?? "").toLowerCase();
  if (["finished", "success", "successful", "running"].includes(normalized)) return "running";
  if (["queued", "pending"].includes(normalized)) return "queued";
  if (["building", "build"].includes(normalized)) return "building";
  if (["in_progress", "deploying", "running_in_progress"].includes(normalized)) return "deploying";
  if (["cancelled", "cancelled-by-user", "stopped"].includes(normalized)) return "stopped";
  if (["failed", "error"].includes(normalized)) return "failed";
  return "deploying";
}

async function resolveServerUuid(): Promise<string> {
  const config = getCoolifyConfig();
  if (config.serverUuid) return config.serverUuid;
  if (cachedServerUuid) return cachedServerUuid;

  const servers = await coolifyRequest<CoolifyServer[]>("GET", "/servers");
  const normalizedName = config.serverName.toLowerCase();
  const match = servers.find((server) => server.name?.toLowerCase() === normalizedName)
    ?? (config.serverIp ? servers.find((server) => server.ip === config.serverIp) : undefined);

  if (!match?.uuid) {
    throw new CoolifyError(
      `Server Coolify "${config.serverName}" tidak ditemukan. Set COOLIFY_SERVER_UUID atau COOLIFY_SERVER_NAME yang sesuai.`,
    );
  }

  cachedServerUuid = match.uuid;
  return match.uuid;
}

async function createCoolifyProject(project: Project): Promise<CoolifyProject> {
  return coolifyRequest<CoolifyProject>("POST", "/projects", {
    name: coolifyProjectName(project),
    description: `Mution project #${project.id}`,
  });
}

async function ensureCoolifyEnvironment(projectUuid: string): Promise<CoolifyEnvironment | null> {
  const { environmentName } = getCoolifyConfig();
  try {
    const environment = await coolifyRequest<CoolifyEnvironment>("POST", `/projects/${projectUuid}/environments`, {
      name: environmentName,
    });
    return environment;
  } catch (err) {
    if (err instanceof CoolifyError && [400, 409, 422].includes(err.statusCode ?? 0)) {
      return null;
    }
    throw err;
  }
}

async function createCoolifyApplication(project: Project, resource: typeof coolifyResourcesTable.$inferSelect): Promise<CoolifyApplication> {
  if (!project.repoUrl) {
    throw new CoolifyError("Project belum punya repository. Pilih repo GitHub dulu sebelum deploy.");
  }

  const config = getCoolifyConfig();
  const domain = normalizeDomain(project.domain);
  const runtime = project.runtime as Runtime;
  const port = runtimePort(runtime);
  const commonPayload: Record<string, unknown> = {
    project_uuid: resource.coolifyProjectUuid,
    server_uuid: resource.coolifyServerUuid,
    environment_name: resource.coolifyEnvironmentName,
    name: coolifyApplicationName(project),
    description: `Mution app for project #${project.id}`,
    git_repository: normalizeRepoUrl(project.repoUrl),
    git_branch: process.env.COOLIFY_DEFAULT_GIT_BRANCH?.trim() || "main",
    build_pack: runtimeBuildPack(runtime),
    ports_exposes: port,
    autodeploy: true,
    autodeploy_enabled: true,
    autogenerate_domain: !domain,
    force_https: true,
    instant_deploy: false,
  };

  if (domain) commonPayload.domains = domain;
  if (runtime === "static") {
    commonPayload.is_static = true;
    commonPayload.static_image = process.env.COOLIFY_STATIC_IMAGE?.trim() || "nginx:alpine";
  }

  if (config.sourceMode === "github-app") {
    if (!config.githubAppUuid) {
      throw new CoolifyError("COOLIFY_GITHUB_APP_UUID wajib diisi untuk deploy private repository.");
    }
    return coolifyRequest<CoolifyApplication>("POST", "/applications/private-github-app", {
      ...commonPayload,
      github_app_uuid: config.githubAppUuid,
    });
  }

  return coolifyRequest<CoolifyApplication>("POST", "/applications/public", commonPayload);
}

async function syncApplicationEnv(applicationUuid: string, runtime: Runtime, projectId: number): Promise<void> {
  const rows = await db
    .select({ key: envVarsTable.key, value: envVarsTable.value })
    .from(envVarsTable)
    .where(eq(envVarsTable.projectId, projectId));

  const envs = buildApplicationEnv(runtime, rows);
  if (envs.length === 0) return;

  await coolifyRequest("PATCH", `/applications/${applicationUuid}/envs/bulk`, {
    data: envs.map((env) => ({
      key: env.key,
      value: env.value,
      is_preview: false,
      is_build_time: false,
      is_literal: false,
    })),
  });
}

async function ensureCoolifyResource(project: Project): Promise<typeof coolifyResourcesTable.$inferSelect> {
  await ensureCoolifyTables();

  const [existing] = await db
    .select()
    .from(coolifyResourcesTable)
    .where(eq(coolifyResourcesTable.projectId, project.id));

  if (existing?.coolifyApplicationUuid) return existing;

  const serverUuid = existing?.coolifyServerUuid ?? await resolveServerUuid();
  const environmentName = existing?.coolifyEnvironmentName ?? getCoolifyConfig().environmentName;

  let resource = existing;
  if (!resource) {
    const coolifyProject = await createCoolifyProject(project);
    const environment = await ensureCoolifyEnvironment(coolifyProject.uuid);

    const [created] = await db
      .insert(coolifyResourcesTable)
      .values({
        projectId: project.id,
        coolifyProjectUuid: coolifyProject.uuid,
        coolifyEnvironmentName: environmentName,
        coolifyEnvironmentUuid: environment?.uuid ?? null,
        coolifyServerUuid: serverUuid,
      })
      .returning();

    resource = created;
  } else {
    await ensureCoolifyEnvironment(resource.coolifyProjectUuid);
  }

  if (!resource.coolifyApplicationUuid) {
    const application = await createCoolifyApplication(project, resource);
    const [updated] = await db
      .update(coolifyResourcesTable)
      .set({
        coolifyApplicationUuid: application.uuid,
        coolifyApplicationName: application.name ?? coolifyApplicationName(project),
        updatedAt: new Date(),
      })
      .where(eq(coolifyResourcesTable.projectId, project.id))
      .returning();

    resource = updated;
  }

  return resource;
}

export async function deployProjectWithCoolify(project: Project, deploymentId: number): Promise<{
  applicationUuid: string;
  deploymentUuid: string | null;
  message: string;
}> {
  const resource = await ensureCoolifyResource(project);
  if (!resource.coolifyApplicationUuid) {
    throw new CoolifyError("Coolify application UUID tidak tersedia setelah provisioning.");
  }

  await syncApplicationEnv(resource.coolifyApplicationUuid, project.runtime as Runtime, project.id);

  const response = await coolifyRequest<CoolifyDeploymentResponse>(
    "POST",
    `/applications/${resource.coolifyApplicationUuid}/start`,
    undefined,
    { force: true },
  );
  const deploymentUuid = response.deployment_uuid ?? response.uuid ?? null;

  if (deploymentUuid) {
    await db
      .insert(coolifyDeploymentsTable)
      .values({
        deploymentId,
        projectId: project.id,
        coolifyDeploymentUuid: deploymentUuid,
        coolifyApplicationUuid: resource.coolifyApplicationUuid,
      })
      .onConflictDoNothing();
  }

  return {
    applicationUuid: resource.coolifyApplicationUuid,
    deploymentUuid,
    message: response.message ?? "Deployment dikirim ke Coolify.",
  };
}

export async function syncDeploymentFromCoolify(deploymentId: number): Promise<{
  status: DeploymentStatus;
  logs: string | null;
} | null> {
  if (!isCoolifyConfigured()) return null;
  await ensureCoolifyTables();

  const [mapping] = await db
    .select()
    .from(coolifyDeploymentsTable)
    .where(eq(coolifyDeploymentsTable.deploymentId, deploymentId));

  if (!mapping) return null;

  const details = await coolifyRequest<CoolifyDeploymentDetails>("GET", `/deployments/${mapping.coolifyDeploymentUuid}`);
  return {
    status: mapCoolifyDeploymentStatus(details.status),
    logs: details.logs ?? null,
  };
}

export async function stopProjectWithCoolify(projectId: number): Promise<boolean> {
  const resource = await getProjectResource(projectId);
  if (!resource?.coolifyApplicationUuid) return false;
  await coolifyRequest("POST", `/applications/${resource.coolifyApplicationUuid}/stop`);
  return true;
}

export async function restartProjectWithCoolify(projectId: number): Promise<boolean> {
  const resource = await getProjectResource(projectId);
  if (!resource?.coolifyApplicationUuid) return false;
  await coolifyRequest("POST", `/applications/${resource.coolifyApplicationUuid}/restart`);
  return true;
}

export async function deleteProjectWithCoolify(projectId: number): Promise<boolean> {
  const resource = await getProjectResource(projectId);
  if (!resource?.coolifyApplicationUuid) return false;
  await coolifyRequest("DELETE", `/applications/${resource.coolifyApplicationUuid}`);
  return true;
}

async function getProjectResource(projectId: number): Promise<typeof coolifyResourcesTable.$inferSelect | null> {
  if (!isCoolifyConfigured()) return null;
  await ensureCoolifyTables();
  const [resource] = await db
    .select()
    .from(coolifyResourcesTable)
    .where(eq(coolifyResourcesTable.projectId, projectId));
  return resource ?? null;
}

export async function getCoolifyIntegrationStatus(): Promise<{
  configured: boolean;
  serverResolved: boolean;
  serverUuid: string | null;
  serverName: string | null;
}> {
  if (!isCoolifyConfigured()) {
    return {
      configured: false,
      serverResolved: false,
      serverUuid: null,
      serverName: null,
    };
  }

  const config = getCoolifyConfig();
  const serverUuid = await resolveServerUuid();
  return {
    configured: true,
    serverResolved: true,
    serverUuid,
    serverName: config.serverName,
  };
}

export function formatCoolifyBuildLog(input: {
  message: string;
  applicationUuid?: string | null;
  deploymentUuid?: string | null;
}): string {
  const lines = [
    `[${new Date().toISOString()}] ${input.message}`,
  ];
  if (input.applicationUuid) lines.push(`Coolify application: ${input.applicationUuid}`);
  if (input.deploymentUuid) lines.push(`Coolify deployment: ${input.deploymentUuid}`);
  return lines.join("\n");
}
