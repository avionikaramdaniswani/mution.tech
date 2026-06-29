import { Router, type Request, type Response } from "express";
import { db, apiKeysTable, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();
const CREDITS_PER_1K_TOKENS = 10;

// ─── Provider pool ────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  openaiBase: string;  // full base for OpenAI calls, e.g. "https://conduit.ozdoev.net/v1"
  apiKey: string;
  type: "conduit" | "generic";
}

const PROVIDER_COOLDOWN_MS = 60_000;
const _cooldowns = new Map<string, number>();

// ─── Admin toggle state (in-memory, resets on restart) ────────────────────────
const _disabledProviders = new Set<string>();

export function adminEnableProvider(id: string) { _disabledProviders.delete(id); }
export function adminDisableProvider(id: string) { _disabledProviders.add(id); }
export function adminGetProviderStatuses() {
  let providers: Provider[];
  try { providers = getProviders(); } catch { return []; }
  const now = Date.now();
  return providers.map((p) => ({
    id: p.id,
    openaiBase: p.openaiBase,
    type: p.type,
    enabled: !_disabledProviders.has(p.id),
    inCooldown: (_cooldowns.get(p.id) ?? 0) > now,
    cooldownExpiresAt: (_cooldowns.get(p.id) ?? 0) > now
      ? new Date(_cooldowns.get(p.id)!).toISOString()
      : null,
  }));
}

function urlToId(url: string): string {
  try { return new URL(url).hostname; } catch { return url.slice(0, 30); }
}

/**
 * Compute the OpenAI-style base URL from a raw URL.
 * Rules:
 *  - If it already ends with /v1        → use as-is
 *  - If it has no path (just a domain)  → append /v1
 *  - Otherwise (path already set)       → use as-is (user knows what they're doing)
 */
function buildOpenaiBase(rawUrl: string): string {
  const url = rawUrl.replace(/\/+$/, "");
  if (url.endsWith("/v1")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return `${url}/v1`;
    }
  } catch {}
  return url;
}

function detectType(url: string): Provider["type"] {
  if (url.includes("conduit.ozdoev.net")) return "conduit";
  return "generic";
}

/**
 * Load all providers.
 *
 * Scans environment for named provider pairs — both must be set:
 *   <PREFIX>_API_KEY  — API key
 *   <PREFIX>_BASE_URL — base URL (no hardcoded defaults)
 *
 * Example secrets:
 *   CONDUIT_API_KEY  + CONDUIT_BASE_URL
 *   IYH_API_KEY      + IYH_BASE_URL
 *
 * Skips any prefix that doesn't have both _API_KEY and _BASE_URL set.
 */
function getProviders(): Provider[] {
  const providers: Provider[] = [];

  // Scan for <PREFIX>_API_KEY, require matching <PREFIX>_BASE_URL
  for (const [envKey, envVal] of Object.entries(process.env)) {
    if (!envKey.endsWith("_API_KEY") || !envVal?.trim()) continue;
    const prefix = envKey.slice(0, -"_API_KEY".length);
    // Skip unrelated env vars
    if (["SESSION", "DATABASE", "SUPABASE", "AGENTROUTER"].some((s) => prefix.includes(s))) continue;

    const rawUrl = (process.env[`${prefix}_BASE_URL`] ?? "").trim();
    if (!rawUrl) {
      logger.warn({ prefix }, `${prefix}_API_KEY found but ${prefix}_BASE_URL not set — skipping`);
      continue;
    }

    providers.push({
      id: prefix.toLowerCase(),
      openaiBase: buildOpenaiBase(rawUrl),
      apiKey: envVal.trim(),
      type: detectType(rawUrl),
    });
  }

  if (providers.length === 0) {
    throw new Error(
      "No providers configured. Each provider needs both <PREFIX>_API_KEY and <PREFIX>_BASE_URL set in Secrets."
    );
  }

  return providers;
}

/** Pick the best available provider (skips disabled + cooldown avoidance). */
function pickProvider(providers: Provider[]): Provider {
  const now = Date.now();
  // Prefer: enabled AND not in cooldown
  const best = providers.find(
    (p) => !_disabledProviders.has(p.id) && (_cooldowns.get(p.id) ?? 0) < now
  );
  if (best) return best;
  // Fallback: enabled but in cooldown
  const enabledAny = providers.find((p) => !_disabledProviders.has(p.id));
  if (enabledAny) {
    logger.warn({ id: enabledAny.id }, "Provider in cooldown but no other enabled provider");
    return enabledAny;
  }
  // All disabled — use first (fail gracefully)
  logger.warn("All providers disabled, using first as fallback");
  return providers[0];
}

/** Pick next available provider excluding the given one (for retry). */
function pickNextProvider(providers: Provider[], exclude: Provider): Provider | null {
  const now = Date.now();
  const others = providers.filter((p) => p.id !== exclude.id && !_disabledProviders.has(p.id));
  if (others.length === 0) return null;
  return others.find((p) => (_cooldowns.get(p.id) ?? 0) < now) ?? others[0];
}

function markCooldown(provider: Provider): void {
  _cooldowns.set(provider.id, Date.now() + PROVIDER_COOLDOWN_MS);
  logger.warn({ provider: provider.id, cooldownSec: PROVIDER_COOLDOWN_MS / 1000 }, "Provider put in cooldown");
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

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

// ─── Format conversion helpers ────────────────────────────────────────────────

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
      content = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    } else {
      content = String(msg.content ?? "");
    }
    messages.push({ role: msg.role, content });
  }

  const model = body.model ?? "claude-sonnet-4-5";

  const converted: any = { model, messages, max_tokens: body.max_tokens ?? 4096, stream: body.stream };
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

  let providers: Provider[];
  try { providers = getProviders(); } catch (e: any) {
    res.status(503).json({ type: "error", error: { type: "api_error", message: e.message } });
    return;
  }

  const originalModel = req.body?.model ?? "unknown";
  const isStream = req.body?.stream === true;

  // Try providers with fallback on non-streaming failures
  for (let attempt = 0; attempt < providers.length; attempt++) {
    const provider = attempt === 0 ? pickProvider(providers) : (pickNextProvider(providers, pickProvider(providers)) ?? pickProvider(providers));

    logger.info({ provider: provider.id, type: provider.type, model: originalModel }, "Proxying /messages");

    try {
      if (provider.type === "conduit") {
        // ── Conduit: native Anthropic pass-through ─────────────────────────
        const upstream = await fetch(`${provider.openaiBase}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": provider.apiKey,
            "anthropic-version": (req.headers["anthropic-version"] as string) ?? "2023-06-01",
            ...(req.headers["anthropic-beta"] ? { "anthropic-beta": req.headers["anthropic-beta"] as string } : {}),
          },
          body: JSON.stringify(req.body),
        });

        if (!upstream.ok && !isStream) {
          const status = upstream.status;
          if (status === 429 || status >= 500) {
            markCooldown(provider);
            if (attempt < providers.length - 1) continue;
          }
          const data = await upstream.json().catch(() => ({}));
          res.status(status).json(data);
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
          const data = await upstream.json() as any;
          res.status(200).json(data);
          const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) || Math.ceil(JSON.stringify(req.body).length / 4);
          await deductCredits(user.id, key.id, tokens, originalModel).catch((e) =>
            logger.error({ err: e }, "deduct credits failed")
          );
        }
        return;

      } else {
        // ── Generic: convert Anthropic → OpenAI format ──────────────────────
        const openAIBody = anthropicToOpenAIBody(req.body);

        const upstream = await fetch(`${provider.openaiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify(openAIBody),
        });

        if (!upstream.ok && !isStream) {
          const status = upstream.status;
          if (status === 429 || status >= 500) {
            markCooldown(provider);
            if (attempt < providers.length - 1) continue;
          }
        }

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
                    type: "content_block_delta", index: 0,
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
            logger.error({ provider: provider.id, status: upstream.status, body: text.slice(0, 500) }, "Provider returned non-JSON");
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
        return;
      }
    } catch (err) {
      logger.error({ err, provider: provider.id }, "Messages proxy error");
      markCooldown(provider);
      if (attempt >= providers.length - 1) {
        if (!res.headersSent) res.status(502).json({ type: "error", error: { type: "api_error", message: "All upstream providers failed" } });
        return;
      }
    }
  }
}

// ─── OpenAI-compatible proxy ──────────────────────────────────────────────────

async function proxyOpenAI(req: Request, res: Response, path: string): Promise<void> {
  const row = await authenticate(req, res);
  if (!row) return;
  const { key, user } = row;

  let providers: Provider[];
  try { providers = getProviders(); } catch (e: any) {
    res.status(503).json({ error: { message: e.message, type: "server_error" } });
    return;
  }

  for (let attempt = 0; attempt < providers.length; attempt++) {
    const provider = attempt === 0 ? pickProvider(providers) : (pickNextProvider(providers, pickProvider(providers)) ?? pickProvider(providers));

    logger.info({ provider: provider.id, path }, "Proxying OpenAI call");

    try {
      const upstream = await fetch(`${provider.openaiBase}${path}`, {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${provider.apiKey}`,
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
        return;

      } else if (contentType.includes("application/json")) {
        if (!upstream.ok && (upstream.status === 429 || upstream.status >= 500)) {
          markCooldown(provider);
          if (attempt < providers.length - 1) continue;
        }
        const data = await upstream.json() as any;
        res.status(upstream.status).json(data);
        if (upstream.ok) {
          const tokens = data.usage?.total_tokens ?? Math.ceil(JSON.stringify(req.body).length / 4);
          await deductCredits(user.id, key.id, tokens, data.model ?? req.body?.model ?? "unknown").catch((e) =>
            logger.error({ err: e }, "deduct credits failed")
          );
        }
        return;

      } else {
        const text = await upstream.text();
        logger.error({ provider: provider.id, status: upstream.status, body: text.slice(0, 300) }, "Provider non-JSON response");
        if (upstream.status === 429 || upstream.status >= 500) {
          markCooldown(provider);
          if (attempt < providers.length - 1) continue;
        }
        res.status(502).json({ error: { message: `Upstream error (${upstream.status})`, type: "server_error" } });
        return;
      }
    } catch (err) {
      logger.error({ err, provider: provider.id }, "OpenAI proxy error");
      markCooldown(provider);
      if (attempt >= providers.length - 1) {
        if (!res.headersSent) res.status(502).json({ error: { message: "All upstream providers failed", type: "server_error" } });
        return;
      }
    }
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/messages", (req, res) => proxyMessages(req, res));
router.post("/chat/completions", (req, res) => proxyOpenAI(req, res, "/chat/completions"));
router.get("/models", (req, res) => proxyOpenAI(req, res, "/models"));
router.post("/completions", (req, res) => proxyOpenAI(req, res, "/completions"));
router.post("/embeddings", (req, res) => proxyOpenAI(req, res, "/embeddings"));

export default router;
