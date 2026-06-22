import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

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

router.get("/auth/github", requireAuth, (_req, res): void => {
  try {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", getClientId());
    url.searchParams.set("redirect_uri", getCallbackUrl());
    url.searchParams.set("scope", "repo,read:user");
    res.redirect(url.toString());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/auth/github/callback", requireAuth, async (req, res): Promise<void> => {
  const { code } = req.query as { code?: string };

  if (!code) {
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
    const ghUser = await userRes.json() as Record<string, string>;

    const user = (req as any).user;
    await db
      .update(usersTable)
      .set({
        githubAccessToken: tokenData.access_token,
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

  res.json({
    connected: !!dbUser?.githubAccessToken,
    login: dbUser?.githubLogin ?? null,
  });
});

router.get("/github/repos", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [dbUser] = await db
    .select({ githubAccessToken: usersTable.githubAccessToken })
    .from(usersTable)
    .where(eq(usersTable.id, user.id));

  if (!dbUser?.githubAccessToken) {
    res.status(403).json({ error: "GitHub not connected" });
    return;
  }

  const reposRes = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&type=owner",
    {
      headers: {
        Authorization: `Bearer ${dbUser.githubAccessToken}`,
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

router.delete("/github/disconnect", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db
    .update(usersTable)
    .set({ githubAccessToken: null, githubLogin: null })
    .where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

export default router;
