import { Router, type Request, type Response } from "express";
import { db, apiKeysTable, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const AGENTROUTER_BASE_URL = process.env.AGENTROUTER_BASE_URL ?? "https://agentrouter.org/v1";
const CREDITS_PER_1K_TOKENS = 10;

function getUpstreamKey(): string {
  const key = process.env.AGENTROUTER_API_KEY;
  if (!key) throw new Error("AGENTROUTER_API_KEY not configured");
  return key;
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

// ─── OpenAI-compatible proxy ────────────────────────────────────────────────

async function proxyOpenAI(req: Request, res: Response, path: string): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: { message: "Missing Authorization header or x-api-key", type: "authentication_error" } });
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
  try { upstreamKey = getUpstreamKey(); } catch {
    res.status(503).json({ error: { message: "Upstream provider not configured", type: "server_error" } });
    return;
  }

  try {
    const upstream = await fetch(`${AGENTROUTER_BASE_URL}${path}`, {
      method: req.method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${upstreamKey}` },
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
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try { const d = JSON.parse(line.slice(6)); if (d.usage?.total_tokens) totalTokens = d.usage.total_tokens; } catch {}
          }
        }
      }
      res.end();
      const model = req.body?.model ?? "unknown";
      const tokens = totalTokens || Math.ceil(JSON.stringify(req.body).length / 4);
      await deductCredits(user.id, key.id, tokens, model).catch((e) => logger.error({ err: e }, "deduct credits failed"));
    } else {
      const data = await upstream.json() as any;
      res.status(upstream.status).json(data);
      if (upstream.ok) {
        const model = data.model ?? req.body?.model ?? "unknown";
        const tokens = data.usage?.total_tokens ?? Math.ceil(JSON.stringify(req.body).length / 4);
        await deductCredits(user.id, key.id, tokens, model).catch((e) => logger.error({ err: e }, "deduct credits failed"));
      }
    }
  } catch (err) {
    logger.error({ err }, "Proxy error");
    if (!res.headersSent) res.status(502).json({ error: { message: "Upstream request failed", type: "server_error" } });
  }
}

// ─── Anthropic Messages API translation ─────────────────────────────────────

interface AnthropicMessage { role: "user" | "assistant"; content: string | Array<{ type: string; text?: string }> }
interface AnthropicRequest {
  model: string;
  max_tokens?: number;
  system?: string;
  messages: AnthropicMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  metadata?: Record<string, unknown>;
}

function contentToString(content: AnthropicMessage["content"]): string {
  if (typeof content === "string") return content;
  return content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

function toOpenAIMessages(req: AnthropicRequest): Array<{ role: string; content: string }> {
  const msgs: Array<{ role: string; content: string }> = [];
  if (req.system) msgs.push({ role: "system", content: req.system });
  for (const m of req.messages) msgs.push({ role: m.role, content: contentToString(m.content) });
  return msgs;
}

function toOpenAIBody(req: AnthropicRequest) {
  return {
    model: req.model,
    messages: toOpenAIMessages(req),
    ...(req.max_tokens && { max_tokens: req.max_tokens }),
    ...(req.temperature !== undefined && { temperature: req.temperature }),
    ...(req.top_p !== undefined && { top_p: req.top_p }),
    ...(req.stop_sequences && { stop: req.stop_sequences }),
    stream: req.stream ?? false,
    stream_options: req.stream ? { include_usage: true } : undefined,
  };
}

function toAnthropicResponse(oaiData: any, model: string): object {
  const choice = oaiData.choices?.[0];
  const text = choice?.message?.content ?? "";
  const inputTokens = oaiData.usage?.prompt_tokens ?? 0;
  const outputTokens = oaiData.usage?.completion_tokens ?? 0;
  return {
    id: oaiData.id ?? `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model,
    stop_reason: choice?.finish_reason === "stop" ? "end_turn" : choice?.finish_reason ?? "end_turn",
    stop_sequence: null,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

function buildAnthropicSSE(events: Array<{ event: string; data: object }>): string {
  return events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n`).join("\n") + "\n";
}

async function proxyMessages(req: Request, res: Response): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Missing x-api-key or Authorization header" } });
    return;
  }
  const row = await resolveKeyAndUser(token);
  if (!row) {
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Invalid or revoked API key" } });
    return;
  }
  const { key, user } = row;
  if (user.credits <= 0) {
    res.status(402).json({ type: "error", error: { type: "overloaded_error", message: "Insufficient credits. Top up at mution.tech/billing" } });
    return;
  }
  let upstreamKey: string;
  try { upstreamKey = getUpstreamKey(); } catch {
    res.status(503).json({ type: "error", error: { type: "api_error", message: "Upstream provider not configured" } });
    return;
  }

  const body = req.body as AnthropicRequest;
  const isStream = body.stream === true;
  const openAIBody = toOpenAIBody(body);

  try {
    const upstream = await fetch(`${AGENTROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${upstreamKey}` },
      body: JSON.stringify(openAIBody),
    });

    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("anthropic-version", "2023-06-01");

      const msgId = `msg_${Date.now()}`;
      const model = body.model;

      res.write(buildAnthropicSSE([
        { event: "message_start", data: { type: "message_start", message: { id: msgId, type: "message", role: "assistant", content: [], model, stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } } },
        { event: "content_block_start", data: { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } } },
        { event: "ping", data: { type: "ping" } },
      ]));

      const reader = upstream.body?.getReader();
      if (!reader) { res.end(); return; }

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const d = JSON.parse(raw);
            const delta = d.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              res.write(`event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: delta } })}\n\n`);
            }
            if (d.usage) {
              totalInputTokens = d.usage.prompt_tokens ?? totalInputTokens;
              totalOutputTokens = d.usage.completion_tokens ?? totalOutputTokens;
            }
            const finishReason = d.choices?.[0]?.finish_reason;
            if (finishReason) {
              const stopReason = finishReason === "stop" ? "end_turn" : finishReason;
              res.write(buildAnthropicSSE([
                { event: "content_block_stop", data: { type: "content_block_stop", index: 0 } },
                { event: "message_delta", data: { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: totalOutputTokens } } },
                { event: "message_stop", data: { type: "message_stop" } },
              ]));
            }
          } catch {}
        }
      }
      res.end();

      const tokens = totalInputTokens + totalOutputTokens || Math.ceil(JSON.stringify(body).length / 4);
      await deductCredits(user.id, key.id, tokens, body.model).catch((e) => logger.error({ err: e }, "deduct credits failed"));
    } else {
      if (!upstream.ok) {
        const errData = await upstream.json().catch(() => ({})) as any;
        res.status(upstream.status).json({ type: "error", error: { type: "api_error", message: errData?.error?.message ?? "Upstream error" } });
        return;
      }
      const oaiData = await upstream.json() as any;
      const anthropicResp = toAnthropicResponse(oaiData, body.model);
      res.status(200).json(anthropicResp);
      const tokens = oaiData.usage?.total_tokens ?? Math.ceil(JSON.stringify(body).length / 4);
      await deductCredits(user.id, key.id, tokens, body.model).catch((e) => logger.error({ err: e }, "deduct credits failed"));
    }
  } catch (err) {
    logger.error({ err }, "Messages proxy error");
    if (!res.headersSent) res.status(502).json({ type: "error", error: { type: "api_error", message: "Upstream request failed" } });
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.post("/chat/completions", (req, res) => proxyOpenAI(req, res, "/chat/completions"));
router.get("/models", (req, res) => proxyOpenAI(req, res, "/models"));
router.post("/completions", (req, res) => proxyOpenAI(req, res, "/completions"));
router.post("/embeddings", (req, res) => proxyOpenAI(req, res, "/embeddings"));
router.post("/messages", (req, res) => proxyMessages(req, res));

export default router;
