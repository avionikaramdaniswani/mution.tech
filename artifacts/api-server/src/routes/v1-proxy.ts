import { Router, type Request, type Response } from "express";
import { db, apiKeysTable, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const CREDITS_PER_1K_TOKENS = 10;

// Key pool with cooldown tracking
const KEY_COOLDOWN_MS = 60_000; // 60 seconds cooldown after unauthorized_client_error
const _keyCooldowns = new Map<string, number>(); // key → cooldown-until timestamp

function getKeys(): string[] {
  const raw = process.env.AGENTROUTER_API_KEY ?? "";
  if (!raw) throw new Error("AGENTROUTER_API_KEY not configured");
  return raw.split(",").map(k => k.trim()).filter(Boolean);
}

function getUpstreamKey(): string {
  const keys = getKeys();
  const now = Date.now();
  // pick first key not in cooldown
  const available = keys.find(k => ((_keyCooldowns.get(k) ?? 0) < now));
  if (available) return available;
  // all keys in cooldown — pick the one with earliest cooldown expiry
  let earliest = keys[0];
  let earliestTs = _keyCooldowns.get(keys[0]) ?? 0;
  for (const k of keys) {
    const ts = _keyCooldowns.get(k) ?? 0;
    if (ts < earliestTs) { earliest = k; earliestTs = ts; }
  }
  logger.warn({ cooldownMs: earliestTs - now }, "All AgentRouter keys in cooldown");
  return earliest;
}

function markKeyCooldown(key: string): void {
  const until = Date.now() + KEY_COOLDOWN_MS;
  _keyCooldowns.set(key, until);
  logger.warn({ keyHint: key.slice(-6), cooldownSec: KEY_COOLDOWN_MS / 1000 }, "Key put in cooldown");
}

function rotateKey(): void {} // kept for compatibility, no-op now

function getBaseUrl(): string {
  const raw = (process.env.AGENTROUTER_BASE_URL ?? "https://conduit.ozdoev.net").replace(/\/+$/, "");
  if (raw.endsWith("/v1")) return raw;
  return `${raw}/v1`;
}

function isOpenRouter(): boolean {
  return (process.env.AGENTROUTER_BASE_URL ?? "").includes("openrouter.ai");
}

function isConduit(): boolean {
  return (process.env.AGENTROUTER_BASE_URL ?? "").includes("conduit.ozdoev.net");
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

// ─── Format conversion helpers ───────────────────────────────────────────────

function mapModelForOpenRouter(model: string): string {
  if (model.startsWith("anthropic/")) return model;
  if (model.startsWith("claude-")) return `anthropic/${model}`;
  return model;
}

function anthropicToOpenAIBody(body: any): any {
  const messages: any[] = [];

  if (body.system) {
    const systemText = typeof body.system === "string"
      ? body.system
      : Array.isArray(body.system)
        ? body.system.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n")
        : String(body.system);
    messages.push({ role: "system", content: systemText });
  }

  for (const msg of body.messages ?? []) {
    let content: string;
    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      content = msg.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");
    } else {
      content = String(msg.content ?? "");
    }
    messages.push({ role: msg.role, content });
  }

  const converted: any = {
    model: mapModelForOpenRouter(body.model ?? "claude-sonnet-4-5"),
    messages,
    max_tokens: body.max_tokens ?? 4096,
    stream: body.stream,
  };
  if (body.temperature !== undefined) converted.temperature = body.temperature;
  if (body.top_p !== undefined) converted.top_p = body.top_p;
  return converted;
}

function openAIToAnthropicResponse(data: any, originalModel: string): any {
  const choice = data.choices?.[0];
  return {
    id: data.id ?? `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: choice?.message?.content ?? "" }],
    model: originalModel,
    stop_reason: choice?.finish_reason === "stop" ? "end_turn" : (choice?.finish_reason ?? "end_turn"),
    stop_sequence: null,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ─── Anthropic /messages proxy ────────────────────────────────────────────────

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
  const openRouter = isOpenRouter();
  const conduit = isConduit();
  const originalModel = req.body?.model ?? "unknown";
  const isStream = req.body?.stream === true;
  const provider = openRouter ? "openrouter" : conduit ? "conduit" : "agentrouter";

  logger.info({ url: `${base}/messages`, model: originalModel, provider }, "Proxying /messages");

  try {
    if (openRouter) {
      // ── OpenRouter: convert Anthropic → OpenAI format ──────────────────────
      const openAIBody = anthropicToOpenAIBody(req.body);

      const upstream = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${upstreamKey}`,
          "HTTP-Referer": "https://mution.tech",
          "X-Title": "Mution",
        },
        body: JSON.stringify(openAIBody),
      });

      if (isStream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("anthropic-version", "2023-06-01");

        const msgId = `msg_${Date.now()}`;

        res.write(sseEvent("message_start", {
          type: "message_start",
          message: { id: msgId, type: "message", role: "assistant", content: [], model: originalModel, stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } },
        }));
        res.write(sseEvent("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }));
        res.write(sseEvent("ping", { type: "ping" }));

        const reader = upstream.body?.getReader();
        if (!reader) { res.end(); return; }

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") continue;
            try {
              const chunk = JSON.parse(raw);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                res.write(sseEvent("content_block_delta", {
                  type: "content_block_delta",
                  index: 0,
                  delta: { type: "text_delta", text: delta },
                }));
                totalOutputTokens += Math.ceil(delta.length / 4);
              }
              if (chunk.usage) {
                totalInputTokens = chunk.usage.prompt_tokens ?? totalInputTokens;
                totalOutputTokens = chunk.usage.completion_tokens ?? totalOutputTokens;
              }
            } catch {}
          }
        }

        res.write(sseEvent("content_block_stop", { type: "content_block_stop", index: 0 }));
        res.write(sseEvent("message_delta", {
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: totalOutputTokens },
        }));
        res.write(sseEvent("message_stop", { type: "message_stop" }));
        res.end();

        const tokens = (totalInputTokens + totalOutputTokens) || Math.ceil(JSON.stringify(req.body).length / 4);
        await deductCredits(user.id, key.id, tokens, originalModel).catch((e) =>
          logger.error({ err: e }, "deduct credits failed")
        );
      } else {
        const contentType = upstream.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          const text = await upstream.text();
          logger.error({ status: upstream.status, body: text.slice(0, 500) }, "OpenRouter returned non-JSON");
          res.status(502).json({ type: "error", error: { type: "api_error", message: `Upstream error (${upstream.status})` } });
          return;
        }

        const data = await upstream.json() as any;
        if (!upstream.ok) {
          res.status(upstream.status).json({ type: "error", error: data.error ?? data });
          return;
        }

        const anthropicResponse = openAIToAnthropicResponse(data, originalModel);
        res.status(200).json(anthropicResponse);

        const tokens = (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0) || Math.ceil(JSON.stringify(req.body).length / 4);
        await deductCredits(user.id, key.id, tokens, originalModel).catch((e) =>
          logger.error({ err: e }, "deduct credits failed")
        );
      }
    } else {
      // ── Conduit / AgentRouter: pass through Anthropic format ──
      const usedKey = conduit ? upstreamKey : (() => {
        // AgentRouter: key rotation + retry
        return getUpstreamKey();
      })();

      const upstream = await fetch(`${base}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": usedKey,
          "anthropic-version": (req.headers["anthropic-version"] as string) ?? "2023-06-01",
          ...(req.headers["anthropic-beta"] ? { "anthropic-beta": req.headers["anthropic-beta"] as string } : {}),
        },
        body: JSON.stringify(req.body),
      });

      if (!upstream) {
        res.status(502).json({ type: "error", error: { type: "api_error", message: "Upstream request failed" } });
        return;
      }

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
              if (d.type === "message_start") totalInputTokens = d.message?.usage?.input_tokens ?? 0;
              if (d.type === "message_delta") totalOutputTokens = d.usage?.output_tokens ?? 0;
            } catch {}
          }
        }
        res.end();

        const tokens = totalInputTokens + totalOutputTokens || Math.ceil(JSON.stringify(req.body).length / 4);
        await deductCredits(user.id, key.id, tokens, originalModel).catch((e) =>
          logger.error({ err: e }, "deduct credits failed")
        );
      } else {
        const contentType = upstream.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          const text = await upstream.text();
          logger.error({ status: upstream.status, body: text.slice(0, 500) }, "Upstream returned non-JSON (WAF block?)");
          res.status(502).json({ type: "error", error: { type: "api_error", message: `Upstream blocked or unreachable (${upstream.status})` } });
          return;
        }

        const data = await upstream.json() as any;
        if (!upstream.ok) {
          logger.error({ status: upstream.status, body: data }, "AgentRouter upstream error");
          res.status(upstream.status).json(data); return;
        }

        res.status(200).json(data);
        const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) || Math.ceil(JSON.stringify(req.body).length / 4);
        await deductCredits(user.id, key.id, tokens, originalModel).catch((e) =>
          logger.error({ err: e }, "deduct credits failed")
        );
      }
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
  const openRouter = isOpenRouter();

  try {
    const upstream = await fetch(`${base}${path}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${upstreamKey}`,
        ...(openRouter ? { "HTTP-Referer": "https://mution.tech", "X-Title": "Mution" } : {}),
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
      logger.error({ status: upstream.status, body: text.slice(0, 300) }, "Upstream non-JSON response");
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
