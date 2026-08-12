import { db, usersTable, projectsTable, type Project } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "./secret-box";
import { logger } from "./logger";

function parseGithubOwnerRepo(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const withScheme = /^https?:\/\//i.test(repoUrl) ? repoUrl : `https://${repoUrl}`;
    const url = new URL(withScheme);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function getWebhookTargetUrl(): string {
  const host = process.env.MUTION_PUBLIC_URL?.trim()
    || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://mution.tech");
  return `${host.replace(/\/+$/, "")}/api/webhooks/github`;
}

/**
 * Automatically registers a GitHub push webhook on the project's repository
 * using the user's stored OAuth access token.
 */
export async function ensureGithubRepoWebhook(project: Project): Promise<boolean> {
  if (!project.repoUrl) return false;

  const parsed = parseGithubOwnerRepo(project.repoUrl);
  if (!parsed) return false;

  const [user] = await db
    .select({ githubAccessToken: usersTable.githubAccessToken })
    .from(usersTable)
    .where(eq(usersTable.id, project.userId));

  if (!user?.githubAccessToken) return false;
  const token = decryptSecret(user.githubAccessToken);
  if (!token) return false;

  const targetUrl = getWebhookTargetUrl();

  try {
    // List existing webhooks to avoid duplicate registration
    const hooksRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/hooks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "mution-platform",
      },
    });

    if (!hooksRes.ok) return false;
    const hooks = (await hooksRes.json()) as Array<{ config?: { url?: string } }>;

    const exists = hooks.some((h) => h.config?.url === targetUrl);
    if (exists) return true;

    // Register new push webhook
    const createRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/hooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "mution-platform",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: targetUrl,
          content_type: "json",
          insecure_ssl: "0",
        },
      }),
    });

    if (createRes.ok) {
      logger.info({ projectId: project.id, repo: `${parsed.owner}/${parsed.repo}` }, "GitHub push webhook auto-registered successfully");
      return true;
    }
    return false;
  } catch (err) {
    logger.warn({ err, projectId: project.id }, "Failed to auto-register GitHub webhook");
    return false;
  }
}
