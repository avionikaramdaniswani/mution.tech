import { Router, type Request, type Response } from "express";
import { db, apiKeysTable, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const CREDITS_PER_1K_TOKENS = 10;

function getUpstreamKey(): string {
  const key = process.env.AGENTROUTER_API_KEY;
  if (!key) throw new Error("AGENTROUTER_API_KEY not configured");
  return key;
}

function getBaseUrl(): string {
  const raw = (process.env.AGENTROUTER_BASE_URL ?? "https://agentrouter.org").replace(/\/+$/, "");
  if (raw.endsWith("/v1")) return raw;
  return `${raw}/v1`;
}

function extractToken(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.trim()) return xApiKey.trim();
  return null;
}

async function resolveKeyAndUser(token: string) {
  if (!token.startsWith("mk_live_")) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .select({ key: apiKeysTable, user: usersTable })
    .from(apiKeysTable)
    .innerJoin(usersTable, eq(apiKeysTable.userId, usersTable.id))
    .where(eq(apiKeysTable.keyHash, hash));
  if (!row || !row.key.isActive) return null;
  return row;
}

async function deductCredits(userId: number, keyId: number, tokensUsed: number, model: string) {
  const credits = Math.max(1, Math.ceil((tokensUsed * CREDITS_PER_1K_TOKENS) / 1000));
  await db
    .update(usersTable)
    .set({ credits: sql`GREATEST(0, ${usersTable.credits} - ${credits})` })
    .where(eq(usersTable.id, userId));
  await db.insert(creditTransactionsTable).values({
    userId,
    type: "usage",
    amount: -credits,
    note: `API — model: ${model}, tokens: ${tokensUsed}`,
  });
  await db
    .update(apiKeysTable)
    .set({
      lastUsedAt: new Date(),
      totalTokensUsed: sql`${apiKeysTable.totalTokensUsed} + ${tokensUsed}`,
      totalRequestsCount: sql`${apiKeysTable.totalRequestsCount} + 1`,
    })
    .where(eq(apiKeysTable.id, keyId));
}

async function authenticate(req: Request, res: Response): Promise<{ key: typeof apiKeysTable.$inferSelect; user: typeof usersTable.$inferSelect } | null> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Missing Authorization header or x-api-key" } });
    return null;
  }
  const row = await resolveKeyAndUser(token);
  if (!row) {
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Invalid or revoked API key" } });
    return null;
  }
  if (row.user.credits <= 0) {
    res.status(402).json({ type: "error", error: { type: "insufficient_quota", message: "Insufficient credits. Top up at mution.tech/billing" } });
    return null;
  }
  return row;
}

// ─── Anthropic Messages API — forward directly to AgentRouter ────────────────

async function proxyMessages(req: Request, res: Response): Promise<void> {
  const row = await authenticate(req, res);
  if (!row) return;
  const { key, user } = row;

  let upstreamKey: string;
  try { upstreamKey = getUpstreamKey(); } catch {
    res.status(503).json({ type: "error", error: { type: "api_error", message: "Upstream provider not configured" } });
    return;
  }

  const base = getBaseUrl();
  const isStream = req.body?.stream === true;

  logger.info({ url: `${base}/messages`, model: req.body?.model }, "Proxying to AgentRouter /messages");

  try {
    const upstream = await fetch(`${base}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": upstreamKey,
        "anthropic-version": (req.headers["anthropic-version"] as string) ?? "2023-06-01",
        ...(req.headers["anthropic-beta"] ? { "anthropic-beta": req.headers["anthropic-beta"] as string } : {}),
      },
      body: JSON.stringify(req.body),
    });

    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("anthropic-version", "2023-06-01");

      const reader = upstream.body?.getReader();
      if (!reader) { res.end(); return; }

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);

        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === "message_start") {
              totalInputTokens = d.message?.usage?.input_tokens ?? 0;
            }
            if (d.type === "message_delta") {
              totalOutputTokens = d.usage?.output_tokens ?? 0;
            }
          } catch {}
        }
      }
      res.end();

      const tokens = totalInputTokens + totalOutputTokens || Math.ceil(JSON.stringify(req.body).length / 4);
      await deductCredits(user.id, key.id, tokens, req.body?.model ?? "unknown").catch((e) =>
        logger.error({ err: e }, "deduct credits failed")
      );
    } else {
      const contentType = upstream.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await upstream.text();
        logger.error({ status: upstream.status, body: text.slice(0, 500) }, "AgentRouter returned non-JSON");
        res.status(502).json({ type: "error", error: { type: "api_error", message: `Upstream error (${upstream.status}): ${text.slice(0, 200)}` } });
        return;
      }

      const data = await upstream.json() as any;

      if (!upstream.ok) {
        res.status(upstream.status).json(data);
        return;
      }

      res.status(200).json(data);

      const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) || Math.ceil(JSON.stringify(req.body).length / 4);
      await deductCredits(user.id, key.id, tokens, data.model ?? req.body?.model ?? "unknown").catch((e) =>
        logger.error({ err: e }, "deduct credits failed")
      );
    }
  } catch (err) {
    logger.error({ err }, "Messages proxy error");
    if (!res.headersSent) res.status(502).json({ type: "error", error: { type: "api_error", message: "Upstream request failed" } });
  }
}

// ─── OpenAI-compatible proxy ─────────────────────────────────────────────────

async function proxyOpenAI(req: Request, res: Response, path: string): Promise<void> {
  const row = await authenticate(req, res);
  if (!row) return;
  const { key, user } = row;

  let upstreamKey: string;
  try { upstreamKey = getUpstreamKey(); } catch {
    res.status(503).json({ error: { message: "Upstream provider not configured", type: "server_error" } });
    return;
  }

  const base = getBaseUrl();

  try {
    const upstream = await fetch(`${base}${path}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${upstreamKey}`,
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    if (contentType.includes("text/event-stream")) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const reader = upstream.body?.getReader();
      if (!reader) { res.end(); return; }
      let totalTokens = 0;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try { const d = JSON.parse(line.slice(6)); if (d.usage?.total_tokens) totalTokens = d.usage.total_tokens; } catch {}
          }
        }
      }
      res.end();
      const tokens = totalTokens || Math.ceil(JSON.stringify(req.body).length / 4);
      await deductCredits(user.id, key.id, tokens, req.body?.model ?? "unknown").catch((e) =>
        logger.error({ err: e }, "deduct credits failed")
      );
    } else if (contentType.includes("application/json")) {
      const data = await upstream.json() as any;
      res.status(upstream.status).json(data);
      if (upstream.ok) {
        const tokens = data.usage?.total_tokens ?? Math.ceil(JSON.stringify(req.body).length / 4);
        await deductCredits(user.id, key.id, tokens, data.model ?? req.body?.model ?? "unknown").catch((e) =>
          logger.error({ err: e }, "deduct credits failed")
        );
      }
    } else {
      const text = await upstream.text();
      logger.error({ status: upstream.status, body: text.slice(0, 300) }, "AgentRouter non-JSON response");
      res.status(502).json({ error: { message: `Upstream error (${upstream.status})`, type: "server_error" } });
    }
  } catch (err) {
    logger.error({ err }, "OpenAI proxy error");
    if (!res.headersSent) res.status(502).json({ error: { message: "Upstream request failed", type: "server_error" } });
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/messages", (req, res) => proxyMessages(req, res));
router.post("/chat/completions", (req, res) => proxyOpenAI(req, res, "/chat/completions"));
router.get("/models", (req, res) => proxyOpenAI(req, res, "/models"));
router.post("/completions", (req, res) => proxyOpenAI(req, res, "/completions"));
router.post("/embeddings", (req, res) => proxyOpenAI(req, res, "/embeddings"));

export default router;
