import { Router, type NextFunction, type Request, type Response } from "express";
import { db, apiKeysTable, usersTable, creditTransactionsTable, apiUsageTable, aiProviderSettingsTable, apiRequestsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";
import { broadcastToUser, broadcastAdmin } from "../lib/events";
import { MODEL_CATALOG, getModelPricing as getCatalogModelPricing } from "@workspace/model-catalog";
import { apiKeyRateLimitKey, rateLimit } from "../lib/security";

const router = Router();
const AiProxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AI_PROXY_RATE_LIMIT_PER_MINUTE ?? 120),
  keyPrefix: "ai-proxy",
  key: apiKeyRateLimitKey,
});

type ApiRequestLogState = {
  requestId: string;
  startedAt: number;
  endpoint: string;
  method: string;
  userId?: number | null;
  keyId?: number | null;
  model?: string | null;
  providerId?: string | null;
  errorType?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  credits?: number;
};

function getApiRequestLog(res: Response): ApiRequestLogState | null {
  return (res.locals as { apiRequestLog?: ApiRequestLogState }).apiRequestLog ?? null;
}

function updateApiRequestLog(res: Response, patch: Partial<ApiRequestLogState>): void {
  const state = getApiRequestLog(res);
  if (state) Object.assign(state, patch);
}

function classifyErrorType(statusCode: number): string | null {
  if (statusCode < 400) return null;
  if (statusCode === 400) return "invalid_request_error";
  if (statusCode === 401) return "authentication_error";
  if (statusCode === 402) return "insufficient_quota";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 429) return "rate_limit";
  if (statusCode >= 500) return "api_error";
  return "http_error";
}

async function writeApiRequestLog(state: ApiRequestLogState, statusCode: number): Promise<void> {
  const errorType = state.errorType ?? classifyErrorType(statusCode);

  try {
    await db.insert(apiRequestsTable).values({
      requestId: state.requestId,
      userId: state.userId ?? null,
      keyId: state.keyId ?? null,
      endpoint: state.endpoint,
      method: state.method,
      model: state.model ?? null,
      providerId: state.providerId ?? null,
      statusCode,
      success: statusCode < 400 && !errorType,
      errorType,
      latencyMs: Math.max(0, Date.now() - state.startedAt),
      promptTokens: state.promptTokens ?? 0,
      completionTokens: state.completionTokens ?? 0,
      totalTokens: state.totalTokens ?? 0,
      credits: state.credits ?? 0,
    });
  } catch (err) {
    logger.error({ err, requestId: state.requestId }, "Failed to write API request log");
  }
}

function apiRequestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  (res.locals as { apiRequestLog?: ApiRequestLogState }).apiRequestLog = {
    requestId,
    startedAt: Date.now(),
    endpoint: req.path,
    method: req.method,
    model: typeof req.body?.model === "string" ? req.body.model : null,
  };
  res.setHeader("X-Request-ID", requestId);
  res.on("finish", () => {
    const state = getApiRequestLog(res);
    if (state) void writeApiRequestLog(state, res.statusCode);
  });
  next();
}

// ─── Per-Model Pricing (kredit per 1K token) ──────────────────────────────────
  // Try partial match — sort by key length DESC so "claude-sonnet-4-7" beats "claude-sonnet-4"
/** Safe fallback token estimate — capped to prevent overcharging when usage data is missing. */
const MAX_OUTPUT_TOKENS = 8_192;
const DEFAULT_OUTPUT_TOKENS = 4_096;
const FALLBACK_MAX_TOKENS = MAX_OUTPUT_TOKENS;
function estimateFallbackTokens(reqBody: any): number {
  // Rough heuristic: count characters of just the user messages, not the full JSON.
  try {
    const msgs = reqBody?.messages;
    if (Array.isArray(msgs)) {
      let chars = 0;
      for (const m of msgs) {
        if (typeof m.content === "string") chars += m.content.length;
        else if (Array.isArray(m.content)) {
          for (const b of m.content) if (b.type === "text") chars += (b.text ?? "").length;
        }
      }
      // ~4 chars per token is a rough estimate, but cap it.
      return Math.min(Math.max(1, Math.ceil(chars / 4)), FALLBACK_MAX_TOKENS);
    }
  } catch { }
  return FALLBACK_MAX_TOKENS;
}

function estimateInputTokens(reqBody: any): number {
  try {
    let chars = 0;
    if (typeof reqBody?.system === "string") chars += reqBody.system.length;
    const msgs = reqBody?.messages;
    if (Array.isArray(msgs)) {
      for (const m of msgs) {
        if (typeof m.content === "string") chars += m.content.length;
        else if (Array.isArray(m.content)) {
          for (const b of m.content) if (b.type === "text") chars += String(b.text ?? "").length;
        } else {
          chars += String(m.content ?? "").length;
        }
      }
    } else {
      chars = JSON.stringify(reqBody ?? {}).length;
    }
    return Math.max(1, chars);
  } catch {
    return FALLBACK_MAX_TOKENS;
  }
}

function getRequestedOutputTokens(body: any): number | null {
  const raw = body?.max_tokens ?? body?.max_completion_tokens ?? DEFAULT_OUTPUT_TOKENS;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > MAX_OUTPUT_TOKENS) {
    return null;
  }
  return raw;
}

function getReservationOutputTokens(path: string, body: any): number | null {
  if (path === "/embeddings") return 0;
  return getRequestedOutputTokens(body);
}

// ─── Provider pool ────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  openaiBase: string;  // full base for OpenAI calls, e.g. "https://conduit.ozdoev.net/v1"
  apiKey: string;
  type: "conduit" | "generic";
}

const PROVIDER_COOLDOWN_MS = 60_000;
const _cooldowns = new Map<string, number>();

// Admin toggle state is persisted in DB and cached briefly for request routing.
const _disabledProviders = new Set<string>();
let _providerSettingsLoadedAt = 0;
let _providerSettingsRefresh: Promise<void> | null = null;
const PROVIDER_SETTINGS_REFRESH_MS = 5_000;

async function refreshProviderSettings(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - _providerSettingsLoadedAt < PROVIDER_SETTINGS_REFRESH_MS) return;

  _providerSettingsRefresh ??= (async () => {
    const rows = await db.select().from(aiProviderSettingsTable);
    _disabledProviders.clear();
    for (const row of rows) {
      if (!row.enabled) _disabledProviders.add(row.id);
    }
    _providerSettingsLoadedAt = Date.now();
  })().finally(() => {
    _providerSettingsRefresh = null;
  });

  await _providerSettingsRefresh;
}

async function refreshProviderSettingsForProxy(): Promise<void> {
  try {
    await refreshProviderSettings();
  } catch (error) {
    logger.error({ err: error }, "Failed to refresh provider settings; using cached provider state");
  }
}

async function setProviderEnabled(id: string, enabled: boolean): Promise<void> {
  const now = new Date();
  await db
    .insert(aiProviderSettingsTable)
    .values({ id, enabled, updatedAt: now })
    .onConflictDoUpdate({
      target: aiProviderSettingsTable.id,
      set: { enabled, updatedAt: now },
    });

  if (enabled) _disabledProviders.delete(id);
  else _disabledProviders.add(id);
  _providerSettingsLoadedAt = Date.now();
}

export async function adminEnableProvider(id: string) { await setProviderEnabled(id, true); }
export async function adminDisableProvider(id: string) { await setProviderEnabled(id, false); }
export async function adminGetProviderStatuses() {
  await refreshProviderSettings(true);
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

// ─── Upstream Health Checker ──────────────────────────────────────────────────
export interface UpstreamHealth {
  status: "Online" | "Degraded" | "Offline";
  latencyMs: number;
  lastChecked: number;
}
const _upstreamHealth = new Map<string, UpstreamHealth>();

export async function getUpstreamHealth() {
  await refreshProviderSettingsForProxy();
  // If multiple providers exist, aggregate or pick the best. For now, we return the first active one or a summary.
  let providers: Provider[];
  try { providers = getProviders(); } catch { return { status: "Offline", latencyMs: 0, lastChecked: 0 }; }

  const active = providers.filter((p) => !_disabledProviders.has(p.id));
  if (active.length === 0) return { status: "Offline", latencyMs: 0, lastChecked: 0 };

  let totalLatency = 0;
  let onlineCount = 0;
  let newestCheck = 0;

  for (const p of active) {
    const h = _upstreamHealth.get(p.id);
    if (h) {
      if (h.status === "Online") {
        onlineCount++;
        totalLatency += h.latencyMs;
      }
      if (h.lastChecked > newestCheck) newestCheck = h.lastChecked;
    }
  }

  if (onlineCount === 0) return { status: "Offline", latencyMs: 0, lastChecked: newestCheck || Date.now() };

  const avgLatency = Math.round(totalLatency / onlineCount);
  const status = onlineCount < active.length ? "Degraded" : "Online";
  return { status, latencyMs: avgLatency, lastChecked: newestCheck };
}

function startUpstreamHealthCheck() {
  const runCheck = async () => {
    await refreshProviderSettingsForProxy();
    let providers: Provider[];
    try { providers = getProviders(); } catch { return; }

    for (const p of providers) {
      if (_disabledProviders.has(p.id)) continue;
      const start = Date.now();
      try {
        const res = await fetch(`${p.openaiBase}/models`, {
          headers: { Authorization: `Bearer ${p.apiKey}` },
          signal: AbortSignal.timeout(10000), // 10s timeout
        });
        const latencyMs = Date.now() - start;
        if (res.ok) {
          _upstreamHealth.set(p.id, { status: "Online", latencyMs, lastChecked: Date.now() });
        } else {
          _upstreamHealth.set(p.id, { status: "Offline", latencyMs, lastChecked: Date.now() });
        }
      } catch (err) {
        _upstreamHealth.set(p.id, { status: "Offline", latencyMs: Date.now() - start, lastChecked: Date.now() });
      }
    }
  };

  // Run once immediately, then every 3 minutes
  runCheck();
  setInterval(runCheck, 3 * 60 * 1000);
}
// Start it async
setTimeout(startUpstreamHealthCheck, 2000);


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
  } catch { }
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

type CreditBreakdown = { inputTokens?: number; outputTokens?: number };
type CreditReservation = {
  userId: number;
  keyId: number;
  credits: number;
};

function calculateCredits(tokensUsed: number, model: string, breakdown?: CreditBreakdown): number {
  const inputTokens = breakdown?.inputTokens ?? 0;
  const outputTokens = breakdown?.outputTokens ?? (inputTokens === 0 ? tokensUsed : 0);
  const pricing = getCatalogModelPricing(model);
  const inputCredits = (inputTokens * pricing.input) / 1000;
  const outputCredits = (outputTokens * pricing.output) / 1000;
  return Math.max(1, Math.ceil(inputCredits + outputCredits));
}

function updateApiRequestUsageLog(
  res: Response,
  tokensUsed: number,
  model: string,
  breakdown?: CreditBreakdown,
): void {
  const inputTokens = breakdown?.inputTokens ?? 0;
  const outputTokens = breakdown?.outputTokens ?? (inputTokens === 0 ? tokensUsed : 0);
  updateApiRequestLog(res, {
    model,
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: tokensUsed,
    credits: calculateCredits(tokensUsed, model, { inputTokens, outputTokens }),
  });
}

function estimateReserveCredits(reqBody: any, model: string, requestedOutputTokens: number): number {
  const inputTokens = estimateInputTokens(reqBody);
  return calculateCredits(inputTokens + requestedOutputTokens, model, {
    inputTokens,
    outputTokens: requestedOutputTokens,
  });
}

async function reserveCredits(userId: number, keyId: number, credits: number): Promise<CreditReservation | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${keyId})`);

    const [key] = await tx.select().from(apiKeysTable).where(eq(apiKeysTable.id, keyId)).limit(1);
    if (!key || !key.isActive) return null;
    if (key.creditLimit !== null && key.totalCreditsUsed + credits > key.creditLimit) return null;

    const [reservedUser] = await tx
      .update(usersTable)
      .set({ credits: sql`${usersTable.credits} - ${credits}` })
      .where(and(eq(usersTable.id, userId), sql`${usersTable.credits} >= ${credits}`))
      .returning({ id: usersTable.id });

    if (!reservedUser) return null;

    await tx
      .update(apiKeysTable)
      .set({ totalCreditsUsed: sql`${apiKeysTable.totalCreditsUsed} + ${credits}` })
      .where(eq(apiKeysTable.id, keyId));

    return { userId, keyId, credits };
  });
}

async function refundReservation(reservation: CreditReservation): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${reservation.keyId})`);
    await tx
      .update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${reservation.credits}` })
      .where(eq(usersTable.id, reservation.userId));
    await tx
      .update(apiKeysTable)
      .set({ totalCreditsUsed: sql`GREATEST(0, ${apiKeysTable.totalCreditsUsed} - ${reservation.credits})` })
      .where(eq(apiKeysTable.id, reservation.keyId));
  });
}

async function finalizeCredits(
  reservation: CreditReservation,
  tokensUsed: number,
  model: string,
  breakdown?: CreditBreakdown,
): Promise<void> {
  const inputTokens = breakdown?.inputTokens ?? 0;
  const outputTokens = breakdown?.outputTokens ?? (inputTokens === 0 ? tokensUsed : 0);
  const credits = calculateCredits(tokensUsed, model, { inputTokens, outputTokens });
  const adjustment = reservation.credits - credits;

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${reservation.keyId})`);

    if (adjustment > 0) {
      await tx
        .update(usersTable)
        .set({ credits: sql`${usersTable.credits} + ${adjustment}` })
        .where(eq(usersTable.id, reservation.userId));
      await tx
        .update(apiKeysTable)
        .set({ totalCreditsUsed: sql`GREATEST(0, ${apiKeysTable.totalCreditsUsed} - ${adjustment})` })
        .where(eq(apiKeysTable.id, reservation.keyId));
    } else if (adjustment < 0) {
      const extra = Math.abs(adjustment);
      await tx
        .update(usersTable)
        .set({ credits: sql`GREATEST(0, ${usersTable.credits} - ${extra})` })
        .where(eq(usersTable.id, reservation.userId));
      await tx
        .update(apiKeysTable)
        .set({ totalCreditsUsed: sql`${apiKeysTable.totalCreditsUsed} + ${extra}` })
        .where(eq(apiKeysTable.id, reservation.keyId));
    }

    await tx.insert(creditTransactionsTable).values({
      userId: reservation.userId,
      type: "usage",
      amount: -credits,
      note: `API - model: ${model}, tokens: ${tokensUsed}`,
    });

    await tx.insert(apiUsageTable).values({
      userId: reservation.userId,
      keyId: reservation.keyId,
      model,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: tokensUsed,
      credits,
    });

    await tx
      .update(apiKeysTable)
      .set({
        lastUsedAt: new Date(),
        totalTokensUsed: sql`${apiKeysTable.totalTokensUsed} + ${tokensUsed}`,
        totalRequestsCount: sql`${apiKeysTable.totalRequestsCount} + 1`,
      })
      .where(eq(apiKeysTable.id, reservation.keyId));
  });

  broadcastToUser(reservation.userId, { type: "credits.changed", amount: -credits });
  broadcastAdmin({ type: "user.credits_adjusted", userId: reservation.userId, amount: -credits });
}

async function finalizeReservation(
  reservation: CreditReservation,
  tokensUsed: number,
  model: string,
  breakdown?: CreditBreakdown,
): Promise<boolean> {
  try {
    await finalizeCredits(reservation, tokensUsed, model, breakdown);
    return true;
  } catch (err) {
    logger.error({ err, userId: reservation.userId, keyId: reservation.keyId, model }, "finalize credits failed");
    return false;
  }
}

async function refundUnfinalizedReservation(reservation: CreditReservation): Promise<void> {
  try {
    await refundReservation(reservation);
  } catch (err) {
    logger.error({ err, userId: reservation.userId, keyId: reservation.keyId }, "refund credit reservation failed");
  }
}

async function authenticate(req: Request, res: Response): Promise<{ key: typeof apiKeysTable.$inferSelect; user: typeof usersTable.$inferSelect } | null> {
  const token = extractToken(req);
  if (!token) {
    updateApiRequestLog(res, { errorType: "authentication_error" });
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Missing Authorization header or x-api-key" } });
    return null;
  }
  const row = await resolveKeyAndUser(token);
  if (!row) {
    updateApiRequestLog(res, { errorType: "authentication_error" });
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Invalid or revoked API key" } });
    return null;
  }
  updateApiRequestLog(res, { userId: row.user.id, keyId: row.key.id });
  if (row.user.credits <= 0) {
    updateApiRequestLog(res, { errorType: "insufficient_quota" });
    res.status(402).json({ type: "error", error: { type: "insufficient_quota", message: "Insufficient credits. Top up at mution.tech/billing" } });
    return null;
  }
  if (row.key.expiresAt && new Date() > new Date(row.key.expiresAt)) {
    updateApiRequestLog(res, { errorType: "forbidden" });
    res.status(403).json({ type: "error", error: { type: "forbidden", message: "API key has expired" } });
    return null;
  }
  if (row.key.creditLimit !== null && row.key.totalCreditsUsed >= row.key.creditLimit) {
    updateApiRequestLog(res, { errorType: "forbidden" });
    res.status(403).json({ type: "error", error: { type: "forbidden", message: "API key has reached its quota limit" } });
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

  const model = body.model ?? "claude-sonnet-4-6";

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
    updateApiRequestLog(res, { errorType: "api_error" });
    res.status(503).json({ type: "error", error: { type: "api_error", message: e.message } });
    return;
  }
  await refreshProviderSettingsForProxy();
  providers = providers.filter((p) => !_disabledProviders.has(p.id));
  if (providers.length === 0) {
    updateApiRequestLog(res, { errorType: "api_error" });
    res.status(503).json({ type: "error", error: { type: "api_error", message: "All AI providers are disabled" } });
    return;
  }

  const originalModel = req.body?.model ?? "unknown";
  const isStream = req.body?.stream === true;
  updateApiRequestLog(res, { model: originalModel });

  if (key.allowedModels && key.allowedModels.length > 0 && !key.allowedModels.includes(originalModel)) {
    updateApiRequestLog(res, { errorType: "forbidden" });
    res.status(403).json({ type: "error", error: { type: "forbidden", message: `API key is not allowed to use model: ${originalModel}` } });
    return;
  }

  const requestedOutputTokens = getRequestedOutputTokens(req.body);
  if (requestedOutputTokens === null) {
    updateApiRequestLog(res, { errorType: "invalid_request_error" });
    res.status(400).json({ type: "error", error: { type: "invalid_request_error", message: `max_tokens must be an integer between 1 and ${MAX_OUTPUT_TOKENS}` } });
    return;
  }

  const reservation = await reserveCredits(
    user.id,
    key.id,
    estimateReserveCredits(req.body, originalModel, requestedOutputTokens),
  );
  if (!reservation) {
    updateApiRequestLog(res, { errorType: "insufficient_quota" });
    res.status(402).json({ type: "error", error: { type: "insufficient_quota", message: "Insufficient credits or API key credit limit for this request" } });
    return;
  }
  let reservationClosed = false;

  try {
  // Try providers with fallback on non-streaming failures
  for (let attempt = 0; attempt < providers.length; attempt++) {
    const provider = attempt === 0 ? pickProvider(providers) : (pickNextProvider(providers, pickProvider(providers)) ?? pickProvider(providers));
    updateApiRequestLog(res, { providerId: provider.id });

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
          updateApiRequestLog(res, { errorType: classifyErrorType(status) });
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
          let sseBuffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const rawChunk = decoder.decode(value, { stream: true });
            res.write(rawChunk);
            sseBuffer += rawChunk;
            const sseLines = sseBuffer.split("\n");
            sseBuffer = sseLines.pop() ?? "";
            for (const line of sseLines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const d = JSON.parse(line.slice(6));
                if (d.type === "message_start") totalInputTokens = d.message?.usage?.input_tokens ?? 0;
                if (d.type === "message_delta") totalOutputTokens = d.usage?.output_tokens ?? 0;
              } catch { }
            }
          }
          res.end();

          const tokens = (totalInputTokens + totalOutputTokens) || estimateFallbackTokens(req.body);
          if (totalInputTokens + totalOutputTokens === 0) {
            logger.warn({ model: originalModel, fallbackTokens: tokens }, "Conduit stream: usage missing, using capped fallback");
          }
          updateApiRequestUsageLog(res, tokens, originalModel, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
          reservationClosed = await finalizeReservation(reservation, tokens, originalModel, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
          if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
        } else {
          const data = await upstream.json() as any;
          res.status(200).json(data);
          const inputTokens = data.usage?.input_tokens ?? 0;
          const outputTokens = data.usage?.output_tokens ?? 0;
          const tokens = (inputTokens + outputTokens) || estimateFallbackTokens(req.body);
          if (inputTokens + outputTokens === 0) {
            logger.warn({ model: originalModel, fallbackTokens: tokens }, "Conduit non-stream: usage missing, using capped fallback");
          }
          updateApiRequestUsageLog(res, tokens, originalModel, { inputTokens, outputTokens });
          reservationClosed = await finalizeReservation(reservation, tokens, originalModel, { inputTokens, outputTokens });
          if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
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
          let actualInputTokens = 0;
          let actualOutputTokens = 0;
          let estimatedOutputChars = 0;
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
                  estimatedOutputChars += delta.length;
                }
                if (chunk.usage) {
                  actualInputTokens = chunk.usage.prompt_tokens ?? actualInputTokens;
                  actualOutputTokens = chunk.usage.completion_tokens ?? actualOutputTokens;
                }
              } catch { }
            }
          }

          // Prefer actual usage from provider; fall back to char estimate; last resort capped fallback.
          const finalInput = actualInputTokens;
          const finalOutput = actualOutputTokens || Math.min(Math.ceil(estimatedOutputChars / 4), FALLBACK_MAX_TOKENS);

          res.write(sseEvent("content_block_stop", { type: "content_block_stop", index: 0 }));
          res.write(sseEvent("message_delta", {
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: finalOutput },
          }));
          res.write(sseEvent("message_stop", { type: "message_stop" }));
          res.end();

          const tokens = (finalInput + finalOutput) || estimateFallbackTokens(req.body);
          if (actualInputTokens + actualOutputTokens === 0) {
            logger.warn({ model: originalModel, fallbackTokens: tokens, estimatedChars: estimatedOutputChars }, "Generic stream: usage missing, using estimate");
          }
          updateApiRequestUsageLog(res, tokens, originalModel, { inputTokens: finalInput, outputTokens: finalOutput });
          reservationClosed = await finalizeReservation(reservation, tokens, originalModel, { inputTokens: finalInput, outputTokens: finalOutput });
          if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
        } else {
          const contentType = upstream.headers.get("content-type") ?? "";
          if (!contentType.includes("application/json")) {
            const text = await upstream.text();
            logger.error({ provider: provider.id, status: upstream.status, body: text.slice(0, 500) }, "Provider returned non-JSON");
            updateApiRequestLog(res, { errorType: "upstream_non_json" });
            res.status(502).json({ type: "error", error: { type: "api_error", message: `Upstream error (${upstream.status})` } });
            return;
          }
          const data = await upstream.json() as any;
          if (!upstream.ok) {
            updateApiRequestLog(res, { errorType: classifyErrorType(upstream.status) });
            res.status(upstream.status).json({ type: "error", error: data.error ?? data });
            return;
          }
          const anthropicResponse = openAIToAnthropicResponse(data, originalModel);
          res.status(200).json(anthropicResponse);

          const inputTokens = data.usage?.prompt_tokens ?? 0;
          const outputTokens = data.usage?.completion_tokens ?? 0;
          const tokens = (inputTokens + outputTokens) || estimateFallbackTokens(req.body);
          updateApiRequestUsageLog(res, tokens, originalModel, { inputTokens, outputTokens });
          reservationClosed = await finalizeReservation(reservation, tokens, originalModel, { inputTokens, outputTokens });
          if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
        }
        return;
      }
    } catch (err) {
      logger.error({ err, provider: provider.id }, "Messages proxy error");
      markCooldown(provider);
      if (attempt >= providers.length - 1) {
        updateApiRequestLog(res, { errorType: "upstream_error" });
        if (!res.headersSent) res.status(502).json({ type: "error", error: { type: "api_error", message: "All upstream providers failed" } });
        return;
      }
    }
  }
  } finally {
    if (!reservationClosed) await refundUnfinalizedReservation(reservation);
  }
}

// ─── OpenAI-compatible proxy ──────────────────────────────────────────────────

function providerOwner(provider: string): string {
  return provider.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function listModels(req: Request, res: Response): Promise<void> {
  const row = await authenticate(req, res);
  if (!row) return;

  const allowed = row.key.allowedModels && row.key.allowedModels.length > 0
    ? new Set(row.key.allowedModels)
    : null;

  const models = MODEL_CATALOG
    .filter((model) => !allowed || allowed.has(model.id))
    .map((model) => ({
      id: model.id,
      object: "model",
      created: 0,
      owned_by: providerOwner(model.provider),
      mution: {
        label: model.label,
        provider: model.provider,
        pricing: model.pricing,
        context: model.context,
        note: model.note ?? null,
        description: model.description,
        aliases: model.aliases ?? [],
      },
    }));

  res.json({
    object: "list",
    data: models,
  });
}

async function proxyOpenAI(req: Request, res: Response, path: string): Promise<void> {
  const row = await authenticate(req, res);
  if (!row) return;
  const { key, user } = row;

  let providers: Provider[];
  try { providers = getProviders(); } catch (e: any) {
    updateApiRequestLog(res, { errorType: "api_error" });
    res.status(503).json({ error: { message: e.message, type: "server_error" } });
    return;
  }
  await refreshProviderSettingsForProxy();
  providers = providers.filter((p) => !_disabledProviders.has(p.id));
  if (providers.length === 0) {
    updateApiRequestLog(res, { errorType: "api_error" });
    res.status(503).json({ error: { message: "All AI providers are disabled", type: "server_error" } });
    return;
  }

  const originalModel = req.method !== "GET" ? req.body?.model ?? "unknown" : "unknown";
  updateApiRequestLog(res, { model: originalModel });
  let reservation: CreditReservation | null = null;
  let reservationClosed = true;

  if (req.method !== "GET") {
    if (key.allowedModels && key.allowedModels.length > 0 && !key.allowedModels.includes(originalModel)) {
      updateApiRequestLog(res, { errorType: "forbidden" });
      res.status(403).json({ error: { message: `API key is not allowed to use model: ${originalModel}`, type: "forbidden" } });
      return;
    }

    const requestedOutputTokens = getReservationOutputTokens(path, req.body);
    if (requestedOutputTokens === null) {
      updateApiRequestLog(res, { errorType: "invalid_request_error" });
      res.status(400).json({ error: { message: `max_tokens must be an integer between 1 and ${MAX_OUTPUT_TOKENS}`, type: "invalid_request_error" } });
      return;
    }

    reservation = await reserveCredits(
      user.id,
      key.id,
      estimateReserveCredits(req.body, originalModel, requestedOutputTokens),
    );
    if (!reservation) {
      updateApiRequestLog(res, { errorType: "insufficient_quota" });
      res.status(402).json({ error: { message: "Insufficient credits or API key credit limit for this request", type: "insufficient_quota" } });
      return;
    }
    reservationClosed = false;
  }

  try {
  for (let attempt = 0; attempt < providers.length; attempt++) {
    const provider = attempt === 0 ? pickProvider(providers) : (pickNextProvider(providers, pickProvider(providers)) ?? pickProvider(providers));
    updateApiRequestLog(res, { providerId: provider.id });

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
        let streamInputTokens = 0;
        let streamOutputTokens = 0;
        const decoder = new TextDecoder();
        let sseBuf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const rawChunk = decoder.decode(value, { stream: true });
          res.write(rawChunk);
          sseBuf += rawChunk;
          const sseLines = sseBuf.split("\n");
          sseBuf = sseLines.pop() ?? "";
          for (const line of sseLines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.usage) {
                  streamInputTokens = d.usage.prompt_tokens ?? streamInputTokens;
                  streamOutputTokens = d.usage.completion_tokens ?? streamOutputTokens;
                }
              } catch { }
            }
          }
        }
        res.end();
        const tokens = (streamInputTokens + streamOutputTokens) || estimateFallbackTokens(req.body);
        if (streamInputTokens + streamOutputTokens === 0) {
          logger.warn({ model: req.body?.model, fallbackTokens: tokens }, "OpenAI stream: usage missing, using capped fallback");
        }
        if (reservation) {
          updateApiRequestUsageLog(res, tokens, originalModel, { inputTokens: streamInputTokens, outputTokens: streamOutputTokens });
          reservationClosed = await finalizeReservation(reservation, tokens, originalModel, { inputTokens: streamInputTokens, outputTokens: streamOutputTokens });
          if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
        }
        return;

      } else if (contentType.includes("application/json")) {
        if (!upstream.ok && (upstream.status === 429 || upstream.status >= 500)) {
          markCooldown(provider);
          if (attempt < providers.length - 1) continue;
        }
        const data = await upstream.json() as any;
        res.status(upstream.status).json(data);
        if (upstream.ok) {
          const inputTokens = data.usage?.prompt_tokens ?? 0;
          const outputTokens = data.usage?.completion_tokens ?? 0;
          const tokens = (data.usage?.total_tokens ?? (inputTokens + outputTokens)) || estimateFallbackTokens(req.body);
          if (!data.usage?.total_tokens && inputTokens + outputTokens === 0) {
            logger.warn({ model: data.model ?? req.body?.model, fallbackTokens: tokens }, "OpenAI non-stream: usage missing, using capped fallback");
          }
          if (reservation) {
            updateApiRequestUsageLog(res, tokens, data.model ?? originalModel, { inputTokens, outputTokens });
            reservationClosed = await finalizeReservation(reservation, tokens, data.model ?? originalModel, { inputTokens, outputTokens });
            if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          }
        } else {
          updateApiRequestLog(res, { errorType: classifyErrorType(upstream.status) });
        }
        return;

      } else {
        const text = await upstream.text();
        logger.error({ provider: provider.id, status: upstream.status, body: text.slice(0, 300) }, "Provider non-JSON response");
        if (upstream.status === 429 || upstream.status >= 500) {
          markCooldown(provider);
          if (attempt < providers.length - 1) continue;
        }
        updateApiRequestLog(res, { errorType: "upstream_non_json" });
        res.status(502).json({ error: { message: `Upstream error (${upstream.status})`, type: "server_error" } });
        return;
      }
    } catch (err) {
      logger.error({ err, provider: provider.id }, "OpenAI proxy error");
      markCooldown(provider);
      if (attempt >= providers.length - 1) {
        updateApiRequestLog(res, { errorType: "upstream_error" });
        if (!res.headersSent) res.status(502).json({ error: { message: "All upstream providers failed", type: "server_error" } });
        return;
      }
    }
  }
  } finally {
    if (reservation && !reservationClosed) await refundUnfinalizedReservation(reservation);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.use(apiRequestLogger);
router.use(AiProxyLimiter);
router.post("/messages", (req, res) => proxyMessages(req, res));
router.post("/chat/completions", (req, res) => proxyOpenAI(req, res, "/chat/completions"));
router.get("/models", (req, res) => listModels(req, res));
router.post("/completions", (req, res) => proxyOpenAI(req, res, "/completions"));
router.post("/embeddings", (req, res) => proxyOpenAI(req, res, "/embeddings"));

export default router;
