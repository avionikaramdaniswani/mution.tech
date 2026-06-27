import { Router, type Request, type Response } from "express";
import { db, apiKeysTable, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const AGENTROUTER_BASE_URL = process.env.AGENTROUTER_BASE_URL ?? "https://agentrouter.org/v1";

function getUpstreamKey(): string {
  const key = process.env.AGENTROUTER_API_KEY;
  if (!key) throw new Error("AGENTROUTER_API_KEY not configured");
  return key;
}

const CREDITS_PER_1K_TOKENS = 10;

function extractBearerToken(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
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

async function proxyRequest(req: Request, res: Response, path: string): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: { message: "Missing or invalid Authorization header", type: "authentication_error" } });
    return;
  }

  const row = await resolveKeyAndUser(token);
  if (!row) {
    res.status(401).json({ error: { message: "Invalid or revoked API key", type: "authentication_error" } });
    return;
  }

  const { key, user } = row;

  if (user.credits <= 0) {
    res.status(402).json({ error: { message: "Insufficient credits. Top up at mution.tech/billing", type: "insufficient_quota" } });
    return;
  }

  let upstreamKey: string;
  try {
    upstreamKey = getUpstreamKey();
  } catch {
    res.status(503).json({ error: { message: "Upstream provider not configured", type: "server_error" } });
    return;
  }

  try {
    const upstream = await fetch(`${AGENTROUTER_BASE_URL}${path}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${upstreamKey}`,
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const isStream = contentType.includes("text/event-stream");

    if (isStream) {
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
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.usage?.total_tokens) totalTokens = data.usage.total_tokens;
            } catch {}
          }
        }
      }
      res.end();

      const model = req.body?.model ?? "unknown";
      const tokens = totalTokens || Math.ceil(JSON.stringify(req.body).length / 4);
      await deductCredits(user.id, key.id, tokens, model).catch((e) =>
        logger.error({ err: e }, "Failed to deduct credits after stream")
      );
    } else {
      const data = await upstream.json() as any;
      res.status(upstream.status).json(data);

      if (upstream.ok) {
        const model = data.model ?? req.body?.model ?? "unknown";
        const tokens = data.usage?.total_tokens ?? Math.ceil(JSON.stringify(req.body).length / 4);
        await deductCredits(user.id, key.id, tokens, model).catch((e) =>
          logger.error({ err: e }, "Failed to deduct credits")
        );
      }
    }
  } catch (err) {
    logger.error({ err }, "Proxy error");
    if (!res.headersSent) {
      res.status(502).json({ error: { message: "Upstream request failed", type: "server_error" } });
    }
  }
}

router.post("/chat/completions", (req, res) => proxyRequest(req, res, "/chat/completions"));
router.get("/models", (req, res) => proxyRequest(req, res, "/models"));
router.post("/completions", (req, res) => proxyRequest(req, res, "/completions"));
router.post("/embeddings", (req, res) => proxyRequest(req, res, "/embeddings"));

export default router;
