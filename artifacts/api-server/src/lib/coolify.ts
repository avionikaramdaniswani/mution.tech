import { eq } from "drizzle-orm";
import {
  coolifyDeploymentsTable,
  coolifyResourcesTable,
  db,
  envVarsTable,
  usersTable,
  type Project,
} from "@workspace/db";
import { ensureCoolifyTables } from "./coolify-schema";
import { decryptSecret } from "./secret-box";

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
  install_command?: string | null;
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

export function sanitizeDeploymentProviderText(value: string): string {
  return value
    .replace(/ghcr\.io\/coollabsio\/coolify-helper:[^\s']+/gi, "mution-builder-helper")
    .replace(/coollabsio\/coolify-helper/gi, "mution-builder-helper")
    .replace(/coolify-helper/gi, "mution-builder")
    .replace(/COOLIFY_/g, "MUTION_")
    .replace(/Coolify/g, "Mution")
    .replace(/coolify/g, "mution");
}

function getCoolifyConfig(): CoolifyConfig {
  const apiUrl = process.env.COOLIFY_API_URL?.trim();
  const apiToken = process.env.COOLIFY_API_TOKEN?.trim();

  if (!apiUrl || !apiToken) {
    throw new CoolifyError("Deployment engine belum dikonfigurasi. Set URL dan token deployment di Config Vars.");
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
      const message = getErrorMessage(parsed) ?? `Deployment engine request failed with status ${res.status}`;
      throw new CoolifyError(message, res.status, parsed);
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof CoolifyError) throw err;
    if ((err as any)?.name === "AbortError") {
      throw new CoolifyError("Deployment engine timeout. Cek koneksi dari Heroku ke server deployment.");
    }
    throw new CoolifyError((err as Error).message || "Deployment engine request failed");
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
  const errorDetails = formatValidationErrors(obj.errors);
  const baseMessage =
    typeof obj.message === "string"
      ? obj.message
      : typeof obj.error === "string"
        ? obj.error
        : null;
  if (baseMessage && errorDetails) return sanitizeDeploymentProviderText(`${baseMessage} ${errorDetails}`);
  if (baseMessage) return sanitizeDeploymentProviderText(baseMessage);
  if (errorDetails) return sanitizeDeploymentProviderText(errorDetails);
  return null;
}

function formatValidationErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;

  const parts = Object.entries(errors as Record<string, unknown>).map(([field, value]) => {
    const messages = Array.isArray(value) ? value : [value];
    return `${field}: ${messages.map((message) => String(message)).join(", ")}`;
  });

  return parts.length > 0 ? parts.join("; ") : null;
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

type BuildPack = "nixpacks" | "static" | "dockerfile";

/**
 * Nixpacks builds on Mution's server resolve packages from a pinned nixpkgs
 * snapshot. If a project ships its own root Dockerfile, prefer that instead:
 * Docker builds aren't limited by that pin (e.g. newer Node/runtime versions
 * requested by the project's own nixpacks.toml/package.json that the pinned
 * snapshot doesn't know about yet), so this lets far more repos deploy as-is.
 */
/** Extracts a strict `owner/repo` pair from a GitHub URL, failing closed on anything else. */
function parseGithubOwnerRepo(repoUrl: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(repoUrl) ? repoUrl : `https://${repoUrl}`;
    const url = new URL(withScheme);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return `${owner}/${repo}`;
  } catch {
    return null;
  }
}

async function detectRootDockerfile(project: Project): Promise<boolean> {
  if (!project.repoUrl) return false;
  const repoPath = parseGithubOwnerRepo(project.repoUrl);
  if (!repoPath) return false;

  try {
    const [owner] = await db
      .select({ githubAccessToken: usersTable.githubAccessToken })
      .from(usersTable)
      .where(eq(usersTable.id, project.userId));

    // A token raises the GitHub API rate limit and is required for private
    // repos, but detection must still work for public repos without one.
    const token = decryptSecret(owner?.githubAccessToken);

    const baseDirectory = normalizeBaseDirectory(project.baseDirectory) ?? "";
    const dockerfileDir = baseDirectory ? baseDirectory.replace(/^\//, "") : "";
    const contentsUrl = `https://api.github.com/repos/${repoPath}/contents/${dockerfileDir ? `${dockerfileDir}/Dockerfile` : "Dockerfile"}`;

    const res = await fetch(contentsUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/vnd.github+json",
        "User-Agent": "mution-platform",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function resolveBuildPack(project: Project, runtime: Runtime): Promise<BuildPack> {
  if (runtime === "static") return "static";
  if (await detectRootDockerfile(project)) return "dockerfile";
  return "nixpacks";
}

function runtimePort(runtime: Runtime): string {
  const envKey = `COOLIFY_${runtime.toUpperCase()}_PORT`;
  const configured = process.env[envKey]?.trim() || process.env.COOLIFY_DEFAULT_PORT?.trim();
  if (configured) return configured;
  if (runtime === "python") return "8000";
  if (runtime === "php" || runtime === "static") return "80";
  return "3000";
}

function getNodeInstallCommand(): string {
  return process.env.MUTION_NODE_INSTALL_COMMAND?.trim()
    || process.env.COOLIFY_NODE_INSTALL_COMMAND?.trim()
    || "pnpm install --no-frozen-lockfile";
}

function runtimeDeploymentSettings(runtime: Runtime): Record<string, unknown> {
  if (runtime === "nodejs") {
    return {
      install_command: getNodeInstallCommand(),
    };
  }
  return {};
}

function buildApplicationEnv(runtime: Runtime, buildPack: BuildPack, rows: Array<{ key: string; value: string }>): Array<{ key: string; value: string }> {
  const env = rows.map((row) => ({ key: row.key, value: row.value }));
  if ((runtime === "nodejs" || runtime === "python") && !env.some((row) => row.key === "PORT")) {
    env.push({ key: "PORT", value: runtimePort(runtime) });
  }
  if (runtime === "nodejs" && buildPack === "nixpacks" && !env.some((row) => row.key === "NIXPACKS_INSTALL_CMD")) {
    env.push({ key: "NIXPACKS_INSTALL_CMD", value: getNodeInstallCommand() });
  }
  return env;
}

function normalizeBaseDirectory(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

function normalizeCommand(command: string | null | undefined): string {
  return (command ?? "").trim().replace(/\s+/g, " ");
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
      `Server deployment "${config.serverName}" tidak ditemukan. Set server UUID atau server name yang sesuai.`,
    );
  }

  cachedServerUuid = match.uuid;
  return match.uuid;
}

async function createCoolifyProject(project: Project): Promise<CoolifyProject> {
  return coolifyRequest<CoolifyProject>("POST", "/projects", {
    name: coolifyProjectName(project),
    description: `Mution project ${project.id}`,
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
  const baseDirectory = normalizeBaseDirectory(project.baseDirectory);
  const buildPack = await resolveBuildPack(project, runtime);
  const commonPayload: Record<string, unknown> = {
    project_uuid: resource.coolifyProjectUuid,
    server_uuid: resource.coolifyServerUuid,
    environment_name: resource.coolifyEnvironmentName,
    name: coolifyApplicationName(project),
    description: `Mution app for project ${project.id}`,
    git_repository: normalizeRepoUrl(project.repoUrl),
    git_branch: process.env.COOLIFY_DEFAULT_GIT_BRANCH?.trim() || "main",
    build_pack: buildPack,
    ports_exposes: port,
    ...(baseDirectory ? { base_directory: baseDirectory } : {}),
    // A project's own Dockerfile already defines install/build/start steps —
    // forcing Nixpacks-specific settings on top of it would be meaningless
    // (and some Coolify versions reject unknown fields for this build pack).
    ...(buildPack === "nixpacks" ? runtimeDeploymentSettings(runtime) : {}),
    is_auto_deploy_enabled: true,
    is_force_https_enabled: true,
    autogenerate_domain: !domain,
    instant_deploy: false,
  };

  if (domain) commonPayload.domains = domain;
  if (runtime === "static" && buildPack === "static") {
    commonPayload.is_static = true;
    commonPayload.static_image = process.env.COOLIFY_STATIC_IMAGE?.trim() || "nginx:alpine";
  }

  if (config.sourceMode === "github-app") {
    if (!config.githubAppUuid) {
      throw new CoolifyError("Konfigurasi GitHub App deployment wajib diisi untuk deploy private repository.");
    }
    return coolifyRequest<CoolifyApplication>("POST", "/applications/private-github-app", {
      ...commonPayload,
      github_app_uuid: config.githubAppUuid,
    });
  }

  return coolifyRequest<CoolifyApplication>("POST", "/applications/public", commonPayload);
}

async function updateCoolifyApplicationSettings(project: Project, applicationUuid: string, buildPack: BuildPack): Promise<void> {
  const runtime = project.runtime as Runtime;
  const settings = buildPack === "nixpacks" ? runtimeDeploymentSettings(runtime) : {};
  const baseDirectory = normalizeBaseDirectory(project.baseDirectory);

  await coolifyRequest("PATCH", `/applications/${applicationUuid}`, {
    // Retrofits existing applications (created before this project added a
    // Dockerfile, or before this feature existed) onto the right build pack
    // on the next deploy, instead of only applying it to brand-new apps.
    build_pack: buildPack,
    ...settings,
    ports_exposes: runtimePort(runtime),
    base_directory: baseDirectory ?? "/",
  });

  // Dockerfile-based apps own their own install/build/start steps, so there's
  // no Nixpacks install_command to reconcile against.
  if (buildPack !== "nixpacks") return;

  const updated = await coolifyRequest<CoolifyApplication>("GET", `/applications/${applicationUuid}`);
  if (
    runtime === "nodejs"
    && normalizeCommand(updated.install_command) !== normalizeCommand(getNodeInstallCommand())
  ) {
    throw new CoolifyError("Build setting belum tersimpan di deployment engine. Coba deploy ulang dari dashboard Mution setelah app Mution selesai di-deploy ke Heroku.");
  }
}

async function syncApplicationEnv(applicationUuid: string, runtime: Runtime, buildPack: BuildPack, projectId: number): Promise<void> {
  const rows = await db
    .select({ key: envVarsTable.key, value: envVarsTable.value })
    .from(envVarsTable)
    .where(eq(envVarsTable.projectId, projectId));

  const envs = buildApplicationEnv(runtime, buildPack, rows);
  if (envs.length === 0) return;

  await coolifyRequest("PATCH", `/applications/${applicationUuid}/envs/bulk`, {
    data: envs.map((env) => ({
      key: env.key,
      value: env.value,
      is_preview: false,
      is_buildtime: true,
      is_runtime: true,
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
    throw new CoolifyError("Application resource tidak tersedia setelah provisioning.");
  }

  const buildPack = await resolveBuildPack(project, project.runtime as Runtime);
  await updateCoolifyApplicationSettings(project, resource.coolifyApplicationUuid, buildPack);
  await syncApplicationEnv(resource.coolifyApplicationUuid, project.runtime as Runtime, buildPack, project.id);

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
    message: sanitizeDeploymentProviderText(response.message ?? "Deployment masuk antrean."),
  };
}

interface BuildFailureDiagnosis {
  title: string;
  explanation: string;
  suggestion: string;
}

const BUILD_FAILURE_PATTERNS: Array<{ test: (logs: string) => boolean; diagnose: (logs: string) => BuildFailureDiagnosis }> = [
  {
    test: (logs) => /error: undefined variable 'nodejs_\d+'/.test(logs),
    diagnose: (logs) => {
      const match = logs.match(/undefined variable '(nodejs_\d+)'/);
      const requested = match?.[1] ?? "versi Node yang diminta";
      return {
        title: "Versi Node.js tidak dikenali oleh builder Nixpacks",
        explanation: `Project ini punya \`nixpacks.toml\` yang minta paket \`${requested}\`, tapi builder Nixpacks di server Mution memakai snapshot Nix yang belum mengenal paket tersebut (biasanya karena versi Node terlalu baru untuk snapshot yang terpasang).`,
        suggestion: "Tambahkan `Dockerfile` di root repo (kalau belum ada) — Mution otomatis memakai Dockerfile itu dan skip Nixpacks kalau terdeteksi, jadi masalah ini gak muncul lagi. Alternatif cepat: turunkan versi di nixpacks.toml ke `nodejs_22` atau `nodejs_20`, lalu deploy ulang.",
      };
    },
  },
  {
    test: (logs) => /ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL[\s\S]*typecheck/.test(logs) || /tsc(?: -p| --build)[\s\S]*error TS\d+/.test(logs),
    diagnose: () => ({
      title: "Build gagal karena error TypeScript",
      explanation: "Script build project ini menjalankan typecheck (`tsc`) sebelum bundling, dan ditemukan error tipe pada kode sumbernya. Ini adalah error asli di kode, bukan masalah dari platform deployment.",
      suggestion: "Perbaiki error TypeScript yang ditunjukkan di log lengkap di atas, commit, lalu deploy ulang.",
    }),
  },
  {
    test: (logs) => /ERR_MODULE_NOT_FOUND/.test(logs) || /Cannot find module/.test(logs),
    diagnose: (logs) => {
      const match = logs.match(/Cannot find (?:package|module) '([^']+)'/);
      const pkg = match?.[1] ?? "sebuah package";
      return {
        title: "Package tidak ditemukan saat build/runtime",
        explanation: `Kode mencoba import \`${pkg}\` tapi package itu tidak ada di \`node_modules\` saat dijalankan. Biasanya karena package ada di devDependencies tapi dipakai di kode production, atau belum ditambahkan ke package.json sama sekali.`,
        suggestion: `Pastikan \`${pkg}\` ada sebagai dependency langsung (bukan devDependency) di package.json service yang menjalankannya, lalu deploy ulang.`,
      };
    },
  },
];

const DIAGNOSIS_LOG_WINDOW = 20_000;

export function diagnoseBuildFailure(logs: string | null | undefined): BuildFailureDiagnosis | null {
  if (!logs) return null;
  const window = logs.length > DIAGNOSIS_LOG_WINDOW ? logs.slice(-DIAGNOSIS_LOG_WINDOW) : logs;
  for (const pattern of BUILD_FAILURE_PATTERNS) {
    if (pattern.test(window)) return pattern.diagnose(window);
  }
  return null;
}

function appendFailureDiagnosis(logs: string, status: DeploymentStatus): string {
  if (status !== "failed") return logs;
  const diagnosis = diagnoseBuildFailure(logs);
  if (!diagnosis) return logs;
  return [
    logs,
    "",
    "──────── Diagnosis Mution ────────",
    `${diagnosis.title}`,
    diagnosis.explanation,
    `Saran: ${diagnosis.suggestion}`,
  ].join("\n");
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
  const status = mapCoolifyDeploymentStatus(details.status);
  const rawLogs = details.logs ? sanitizeDeploymentProviderText(details.logs) : null;
  return {
    status,
    logs: rawLogs ? appendFailureDiagnosis(rawLogs, status) : null,
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
    `[${new Date().toISOString()}] ${sanitizeDeploymentProviderText(input.message)}`,
  ];
  if (input.applicationUuid) lines.push(`Application resource: ${input.applicationUuid}`);
  if (input.deploymentUuid) lines.push(`Deployment run: ${input.deploymentUuid}`);
  return lines.join("\n");
}
