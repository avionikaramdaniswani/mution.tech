import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "../lib/auth";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "../lib/secret-box";
import { logger } from "../lib/logger";

const router = Router();
const GITHUB_STATE_COOKIE = "github_oauth_state";
const GITHUB_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const REPO_FULL_NAME_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function getClientId() {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) throw new Error("GITHUB_CLIENT_ID is not set");
  return id;
}

function getClientSecret() {
  const s = process.env.GITHUB_CLIENT_SECRET;
  if (!s) throw new Error("GITHUB_CLIENT_SECRET is not set");
  return s;
}

function getCallbackUrl() {
  if (process.env.GITHUB_CALLBACK_URL) return process.env.GITHUB_CALLBACK_URL;
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) return `https://${domain}/api/auth/github/callback`;
  throw new Error("Cannot determine GitHub callback URL. Set GITHUB_CALLBACK_URL.");
}

function getGithubScopes(): string {
  return process.env.GITHUB_OAUTH_SCOPES ?? "read:user public_repo";
}

function setGithubStateCookie(res: any, state: string): void {
  res.cookie(GITHUB_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GITHUB_STATE_MAX_AGE_MS,
  });
}

function clearGithubStateCookie(res: any): void {
  res.clearCookie(GITHUB_STATE_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

async function getStoredGithubToken(userId: number): Promise<string | null> {
  const [dbUser] = await db
    .select({ githubAccessToken: usersTable.githubAccessToken })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const storedToken = dbUser?.githubAccessToken;
  const token = decryptSecret(storedToken);
  if (token && storedToken && !isEncryptedSecret(storedToken)) {
    try {
      await db
        .update(usersTable)
        .set({ githubAccessToken: encryptSecret(token) })
        .where(eq(usersTable.id, userId));
    } catch (err) {
      logger.error({ err, userId }, "Failed to migrate plaintext GitHub token");
    }
  }
  return token;
}

router.get("/auth/github", requireAuth, (_req, res): void => {
  try {
    const state = crypto.randomBytes(32).toString("base64url");
    setGithubStateCookie(res, state);

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", getClientId());
    url.searchParams.set("redirect_uri", getCallbackUrl());
    url.searchParams.set("scope", getGithubScopes());
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/auth/github/callback", requireAuth, async (req, res): Promise<void> => {
  const { code, state } = req.query as { code?: string; state?: string };
  const expectedState = req.cookies?.[GITHUB_STATE_COOKIE];
  clearGithubStateCookie(res);

  if (!code || !state || typeof expectedState !== "string" || state !== expectedState) {
    res.redirect("/github-callback?status=error");
    return;
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        code,
        redirect_uri: getCallbackUrl(),
      }),
    });

    const tokenData = await tokenRes.json() as Record<string, string>;

    if (!tokenData.access_token) {
      res.redirect("/github-callback?status=error");
      return;
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "paas-platform",
      },
    });
    if (!userRes.ok) {
      res.redirect("/github-callback?status=error");
      return;
    }
    const ghUser = await userRes.json() as Record<string, string>;

    const user = (req as any).user;
    await db
      .update(usersTable)
      .set({
        githubAccessToken: encryptSecret(tokenData.access_token),
        githubLogin: ghUser.login ?? null,
      })
      .where(eq(usersTable.id, user.id));

    res.redirect("/github-callback?status=connected");
  } catch {
    res.redirect("/github-callback?status=error");
  }
});

router.get("/github/status", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [dbUser] = await db
    .select({ githubLogin: usersTable.githubLogin, githubAccessToken: usersTable.githubAccessToken })
    .from(usersTable)
    .where(eq(usersTable.id, user.id));
  const token = await getStoredGithubToken(user.id);

  res.json({
    connected: !!token,
    login: dbUser?.githubLogin ?? null,
  });
});

router.get("/github/repos", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const accessToken = await getStoredGithubToken(user.id);

  if (!accessToken) {
    res.status(403).json({ error: "GitHub not connected" });
    return;
  }

  const reposRes = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&type=owner",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "paas-platform",
      },
    },
  );

  if (!reposRes.ok) {
    res.status(502).json({ error: "Failed to fetch repos from GitHub" });
    return;
  }

  const repos = await reposRes.json() as any[];
  res.json(
    repos.map((r) => ({
      id: r.id,
      fullName: r.full_name as string,
      htmlUrl: r.html_url as string,
      cloneUrl: r.clone_url as string,
      language: (r.language as string | null) ?? null,
      private: r.private as boolean,
      description: (r.description as string | null) ?? null,
      updatedAt: r.updated_at as string,
    })),
  );
});

router.get("/github/detect-runtime", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { repo } = req.query as { repo?: string };

  if (!repo || !REPO_FULL_NAME_RE.test(repo)) {
    res.status(400).json({ error: "Invalid repo format. Use owner/repo." });
    return;
  }

  const accessToken = await getStoredGithubToken(user.id);

  if (!accessToken) {
    res.status(403).json({ error: "GitHub not connected" });
    return;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "paas-platform",
  };

  const contentsRes = await fetch(`https://api.github.com/repos/${repo}/contents/`, { headers });

  if (!contentsRes.ok) {
    res.json({ runtime: "nodejs", confidence: "fallback" });
    return;
  }

  const files = await contentsRes.json() as Array<{ name: string }>;
  const names = files.map((f) => f.name.toLowerCase());

  let runtime = "nodejs";
  let confidence = "detected";

  if (names.includes("package.json")) {
    runtime = "nodejs";
  } else if (
    names.includes("requirements.txt") ||
    names.includes("pyproject.toml") ||
    names.includes("pipfile") ||
    names.includes("setup.py")
  ) {
    runtime = "python";
  } else if (names.includes("composer.json") || names.some((n) => n.endsWith(".php"))) {
    runtime = "php";
  } else if (
    names.includes("index.html") ||
    names.some((n) => n.endsWith(".html"))
  ) {
    runtime = "static";
  } else {
    confidence = "fallback";
  }

  res.json({ runtime, confidence });
});

router.delete("/github/disconnect", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db
    .update(usersTable)
    .set({ githubAccessToken: null, githubLogin: null })
    .where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

export default router;
