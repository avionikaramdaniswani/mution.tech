import type { Request, Response } from "express";
import { logger } from "../../../lib/logger";
import type { Provider, CreditReservation } from "../types";
import { MAX_OUTPUT_TOKENS } from "../types";
import { authenticate } from "../services/auth";
import {
  updateApiRequestLog,
  classifyErrorType,
  upstreamBodySnippet,
} from "../services/logging";
import {
  getReservationOutputTokens,
  estimateReserveCredits,
  reserveCredits,
  finalizeReservation,
  refundUnfinalizedReservation,
  extractCachedTokens,
  estimateFallbackTokens,
  updateApiRequestUsageLog,
} from "../services/billing";
import {
  getProviders,
  refreshProviderSettingsForProxy,
  _disabledProviders,
  filterProvidersForModel,
  orderProvidersForAttempts,
  upstreamModelFor,
  markCooldown,
} from "../services/providers";

export async function proxyOpenAI(req: Request, res: Response, path: string): Promise<void> {
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
  if (req.method !== "GET") providers = filterProvidersForModel(providers, originalModel);
  if (req.method !== "GET") providers = orderProvidersForAttempts(providers);
  updateApiRequestLog(res, { model: originalModel });
  if (req.method !== "GET" && providers.length === 0) {
    res.status(503).json({ error: { message: `Model ${originalModel} is disabled on all providers`, type: "model_unavailable" } });
    return;
  }
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
      originalModel,
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
      const provider = providers[attempt];
      const providerBody = req.method !== "GET" ? { ...req.body, model: upstreamModelFor(provider, originalModel) } : req.body;
      if (providerBody && providerBody.stream === true) {
        providerBody.stream_options = { ...(providerBody.stream_options || {}), include_usage: true };
      }
      updateApiRequestLog(res, { providerId: provider.id });

      logger.info({ provider: provider.id, path }, "Proxying OpenAI call");

      try {
        const upstream = await fetch(`${provider.openaiBase}${path}`, {
          method: req.method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${provider.apiKey}`,
          },
          body: req.method !== "GET" ? JSON.stringify(providerBody) : undefined,
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
          let streamCachedTokens = 0;
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
                    streamCachedTokens = extractCachedTokens(d.usage) || streamCachedTokens;
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
            const breakdown = (streamInputTokens + streamOutputTokens > 0)
              ? { inputTokens: streamInputTokens, outputTokens: streamOutputTokens, cachedTokens: streamCachedTokens }
              : undefined;
            updateApiRequestUsageLog(res, tokens, originalModel, breakdown, !!reservation?.tokenPackageId);
            reservationClosed = await finalizeReservation(reservation, tokens, originalModel, breakdown);
            if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          }
          return;

        } else if (contentType.includes("application/json")) {
          if (!upstream.ok && (upstream.status === 401 || upstream.status === 402 || upstream.status === 403 || upstream.status === 429 || upstream.status >= 500)) {
            markCooldown(provider);
            if (attempt < providers.length - 1) continue;
          }
          const data = await upstream.json() as any;
          res.status(upstream.status).json(data);
          if (upstream.ok) {
            const inputTokens = data.usage?.prompt_tokens ?? 0;
            const outputTokens = data.usage?.completion_tokens ?? 0;
            const cachedTokens = extractCachedTokens(data.usage);
            const tokens = (data.usage?.total_tokens ?? (inputTokens + outputTokens)) || estimateFallbackTokens(req.body);
            if (!data.usage?.total_tokens && inputTokens + outputTokens === 0) {
              logger.warn({ model: data.model ?? req.body?.model, fallbackTokens: tokens }, "OpenAI non-stream: usage missing, using capped fallback");
            }
            if (reservation) {
              const breakdown = (inputTokens + outputTokens > 0)
                ? { inputTokens, outputTokens, cachedTokens }
                : undefined;
              updateApiRequestUsageLog(res, tokens, data.model ?? originalModel, breakdown, !!reservation?.tokenPackageId);
              reservationClosed = await finalizeReservation(reservation, tokens, data.model ?? originalModel, breakdown);
              if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
            }
          } else {
            updateApiRequestLog(res, { errorType: classifyErrorType(upstream.status) });
          }
          return;

        } else {
          const text = await upstream.text();
          logger.error({ provider: provider.id, status: upstream.status, body: text.slice(0, 300) }, "Provider non-JSON response");
          if (upstream.status === 401 || upstream.status === 402 || upstream.status === 403 || upstream.status === 429 || upstream.status >= 500) {
            markCooldown(provider);
            if (attempt < providers.length - 1) continue;
          }
          updateApiRequestLog(res, { errorType: "upstream_non_json" });
          res.status(502).json({ error: { message: `Upstream error (${upstream.status})${upstreamBodySnippet(text)}`, type: "server_error" } });
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
