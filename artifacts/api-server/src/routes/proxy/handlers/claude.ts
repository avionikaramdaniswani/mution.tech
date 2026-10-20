import type { Request, Response } from "express";
import { logger } from "../../../lib/logger";
import type { Provider } from "../types";
import { MAX_OUTPUT_TOKENS, FALLBACK_MAX_TOKENS } from "../types";
import { authenticate } from "../services/auth";
import {
  updateApiRequestLog,
  classifyErrorType,
  upstreamBodySnippet,
} from "../services/logging";
import {
  getRequestedOutputTokens,
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

export function anthropicToOpenAIBody(body: any): any {
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
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      const textParts = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text);
      const toolUseParts = msg.content.filter((b: any) => b.type === "tool_use");

      const assistantMsg: any = {
        role: "assistant",
        content: textParts.join("\n") || null,
      };

      if (toolUseParts.length > 0) {
        assistantMsg.tool_calls = toolUseParts.map((tu: any) => ({
          id: tu.id,
          type: "function",
          function: {
            name: tu.name,
            arguments: typeof tu.input === "string" ? tu.input : JSON.stringify(tu.input ?? {}),
          },
        }));
      }

      messages.push(assistantMsg);
    } else if (msg.role === "user" && Array.isArray(msg.content)) {
      const toolResults = msg.content.filter((b: any) => b.type === "tool_result");
      const otherParts = msg.content.filter((b: any) => b.type !== "tool_result");

      for (const tr of toolResults) {
        let trContent: string;
        if (typeof tr.content === "string") {
          trContent = tr.content;
        } else if (Array.isArray(tr.content)) {
          trContent = tr.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
        } else {
          trContent = String(tr.content ?? "");
        }
        messages.push({
          role: "tool",
          tool_call_id: tr.tool_use_id,
          content: trContent,
        });
      }

      if (otherParts.length > 0) {
        const textContent = otherParts.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
        if (textContent) {
          messages.push({ role: "user", content: textContent });
        }
      } else if (toolResults.length === 0) {
        const content = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
        messages.push({ role: "user", content });
      }
    } else {
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
  }

  const model = body.model ?? "claude-sonnet-4-6";

  const converted: any = { model, messages, max_tokens: body.max_tokens ?? 4096, stream: body.stream };
  if (body.temperature !== undefined) converted.temperature = body.temperature;
  if (body.top_p !== undefined) converted.top_p = body.top_p;

  if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
    converted.tools = body.tools.map((tool: any) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description ?? "",
        parameters: tool.input_schema ?? { type: "object", properties: {} },
      },
    }));
  }

  if (body.tool_choice) {
    if (typeof body.tool_choice === "object" && body.tool_choice.type === "tool") {
      converted.tool_choice = { type: "function", function: { name: body.tool_choice.name } };
    } else if (body.tool_choice === "auto" || (typeof body.tool_choice === "object" && body.tool_choice.type === "auto")) {
      converted.tool_choice = "auto";
    } else if (body.tool_choice === "any" || (typeof body.tool_choice === "object" && body.tool_choice.type === "any")) {
      converted.tool_choice = "required";
    } else if (body.tool_choice === "none") {
      converted.tool_choice = "none";
    }
  }

  if (body.stream) {
    converted.stream_options = { include_usage: true };
  }

  return converted;
}

export function openAIToAnthropicResponse(data: any, originalModel: string): any {
  const choice = data.choices?.[0];
  const content: any[] = [];

  if (choice?.message?.content) {
    content.push({ type: "text", text: choice.message.content });
  }

  if (choice?.message?.tool_calls && Array.isArray(choice.message.tool_calls)) {
    for (const tc of choice.message.tool_calls) {
      let input: any;
      try {
        input = JSON.parse(tc.function?.arguments ?? "{}");
      } catch {
        input = {};
      }
      content.push({
        type: "tool_use",
        id: tc.id ?? `toolu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: tc.function?.name ?? "unknown",
        input,
      });
    }
  }

  if (content.length === 0) {
    content.push({ type: "text", text: "" });
  }

  const stopReason = choice?.finish_reason === "tool_calls" ? "tool_use"
    : choice?.finish_reason === "stop" ? "end_turn"
    : (choice?.finish_reason ?? "end_turn");

  return {
    id: data.id ?? `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    content,
    model: originalModel,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

export function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const SSE_HEARTBEAT_MS = 10_000;

export function startMessagesStream(res: Response): { close: () => void; sendError: (message: string) => void } {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("anthropic-version", "2023-06-01");
  res.flushHeaders();
  res.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(": heartbeat\n\n");
  }, SSE_HEARTBEAT_MS);
  const close = () => clearInterval(heartbeat);
  res.once("close", close);

  return {
    close,
    sendError: (message: string) => {
      if (!res.writableEnded) {
        res.write(sseEvent("error", { type: "error", error: { type: "api_error", message } }));
        res.end();
      }
      close();
    },
  };
}

export async function proxyMessages(req: Request, res: Response): Promise<void> {
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
  providers = filterProvidersForModel(providers, originalModel);
  providers = orderProvidersForAttempts(providers);
  updateApiRequestLog(res, { model: originalModel });
  if (providers.length === 0) {
    res.status(503).json({ type: "error", error: { type: "model_unavailable", message: `Model ${originalModel} is disabled on all providers` } });
    return;
  }

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
    originalModel,
  );
  if (!reservation) {
    updateApiRequestLog(res, { errorType: "insufficient_quota" });
    res.status(402).json({ type: "error", error: { type: "insufficient_quota", message: "Insufficient credits or API key credit limit for this request" } });
    return;
  }
  let reservationClosed = false;
  let streamSession: { close: () => void; sendError: (message: string) => void } | null = null;

  try {
    for (let attempt = 0; attempt < providers.length; attempt++) {
      const provider = providers[attempt];
      const providerBody = { ...req.body, model: upstreamModelFor(provider, originalModel) };
      updateApiRequestLog(res, { providerId: provider.id });

      logger.info({ provider: provider.id, type: provider.type, model: originalModel }, "Proxying /messages");

      try {
        if (provider.type === "conduit") {
          const upstream = await fetch(`${provider.openaiBase}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": provider.apiKey,
              "anthropic-version": (req.headers["anthropic-version"] as string) ?? "2023-06-01",
              ...(req.headers["anthropic-beta"] ? { "anthropic-beta": req.headers["anthropic-beta"] as string } : {}),
            },
            body: JSON.stringify(providerBody),
          });

          if (!upstream.ok) {
            const status = upstream.status;
            if (status === 401 || status === 402 || status === 403 || status === 429 || status >= 500) {
              markCooldown(provider);
              if (attempt < providers.length - 1) continue;
            }
            const text = await upstream.text().catch(() => "");
            updateApiRequestLog(res, { errorType: classifyErrorType(status) });
            if (!res.headersSent) {
              let data: any;
              try { data = JSON.parse(text); } catch { }
              res.status(status).json(data?.error ? data : {
                type: "error",
                error: { type: classifyErrorType(status), message: data?.message || data?.error || `Upstream error (${status})` },
              });
            }
            return;
          }

          if (isStream && !upstream.headers.get("content-type")?.includes("text/event-stream")) {
            const body = await upstream.text().catch(() => "");
            logger.error({ provider: provider.id, status: upstream.status, contentType: upstream.headers.get("content-type"), body: body.slice(0, 500) }, "Conduit returned an invalid streaming response");
            updateApiRequestLog(res, { errorType: "upstream_non_sse" });
            if (!res.headersSent) {
              res.status(502).json({ type: "error", error: { type: "api_error", message: "Upstream provider did not return a streaming response" } });
            } else {
              streamSession?.sendError("Upstream provider did not return a streaming response");
            }
            return;
          }

          if (isStream) {
            const reader = upstream.body?.getReader();
            if (!reader) {
              updateApiRequestLog(res, { errorType: "upstream_non_sse" });
              if (!res.headersSent) {
                res.status(502).json({ type: "error", error: { type: "api_error", message: "Upstream provider returned an empty streaming response" } });
              } else {
                streamSession?.sendError("Upstream provider returned an empty streaming response");
              }
              return;
            }
            streamSession = startMessagesStream(res);
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            let totalCachedTokens = 0;
            const decoder = new TextDecoder();
            let sseBuffer = "";

            const keepAliveInterval = setInterval(() => {
              try { res.write(": heartbeat\n\n"); } catch { }
            }, 15000);

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
                  if (d.type === "message_start") {
                    totalInputTokens = d.message?.usage?.input_tokens ?? 0;
                    totalCachedTokens = extractCachedTokens(d.message?.usage);
                  }
                  if (d.type === "message_delta") totalOutputTokens = d.usage?.output_tokens ?? 0;
                } catch { }
              }
            }
            clearInterval(keepAliveInterval);
            res.end();
            streamSession?.close();

            const tokens = (totalInputTokens + totalOutputTokens) || estimateFallbackTokens(req.body);
            if (totalInputTokens + totalOutputTokens === 0) {
              logger.warn({ model: originalModel, fallbackTokens: tokens }, "Conduit stream: usage missing, using capped fallback");
            }
            const breakdown = (totalInputTokens + totalOutputTokens > 0)
              ? { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cachedTokens: totalCachedTokens }
              : undefined;
            updateApiRequestUsageLog(res, tokens, originalModel, breakdown, !!reservation?.tokenPackageId);
            reservationClosed = await finalizeReservation(reservation, tokens, originalModel, breakdown);
            if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          } else {
            const data = await upstream.json() as any;
            res.status(200).json(data);
            const inputTokens = data.usage?.input_tokens ?? 0;
            const outputTokens = data.usage?.output_tokens ?? 0;
            const cachedTokens = extractCachedTokens(data.usage);
            const tokens = (inputTokens + outputTokens) || estimateFallbackTokens(req.body);
            if (inputTokens + outputTokens === 0) {
              logger.warn({ model: originalModel, fallbackTokens: tokens }, "Conduit non-stream: usage missing, using capped fallback");
            }
            const breakdown = (inputTokens + outputTokens > 0)
              ? { inputTokens, outputTokens, cachedTokens }
              : undefined;
            updateApiRequestUsageLog(res, tokens, originalModel, breakdown, !!reservation?.tokenPackageId);
            reservationClosed = await finalizeReservation(reservation, tokens, originalModel, breakdown);
            if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          }
          return;

        } else {
          const openAIBody = anthropicToOpenAIBody(providerBody);

          const upstream = await fetch(`${provider.openaiBase}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify(openAIBody),
          });

          if (!upstream.ok) {
            const status = upstream.status;
            if (status === 401 || status === 402 || status === 403 || status === 429 || status >= 500) {
              markCooldown(provider);
              if (attempt < providers.length - 1) continue;
            }
            const text = await upstream.text().catch(() => "");
            updateApiRequestLog(res, { errorType: classifyErrorType(status) });
            if (!res.headersSent) {
              let data: any;
              try { data = JSON.parse(text); } catch { }
              res.status(status).json(data?.error ? data : {
                type: "error",
                error: { type: classifyErrorType(status), message: data?.message || data?.error || `Upstream error (${status})` },
              });
            }
            return;
          }

          if (isStream && !upstream.headers.get("content-type")?.includes("text/event-stream")) {
            const body = await upstream.text().catch(() => "");
            logger.error({ provider: provider.id, status: upstream.status, contentType: upstream.headers.get("content-type"), body: body.slice(0, 500) }, "Generic provider returned an invalid streaming response");
            updateApiRequestLog(res, { errorType: "upstream_non_sse" });
            if (!res.headersSent) {
              res.status(502).json({ type: "error", error: { type: "api_error", message: "Upstream provider did not return a streaming response" } });
            } else {
              streamSession?.sendError("Upstream provider did not return a streaming response");
            }
            return;
          }

          if (isStream) {
            const reader = upstream.body?.getReader();
            if (!reader) {
              updateApiRequestLog(res, { errorType: "upstream_non_sse" });
              if (!res.headersSent) {
                res.status(502).json({ type: "error", error: { type: "api_error", message: "Upstream provider returned an empty streaming response" } });
              } else {
                streamSession?.sendError("Upstream provider returned an empty streaming response");
              }
              return;
            }

            streamSession = startMessagesStream(res);

            const msgId = `msg_${Date.now()}`;
            res.write(sseEvent("message_start", {
              type: "message_start",
              message: { id: msgId, type: "message", role: "assistant", content: [], model: originalModel, stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } },
            }));
            res.write(sseEvent("ping", { type: "ping" }));
            let actualInputTokens = 0;
            let actualOutputTokens = 0;
            let actualCachedTokens = 0;
            let estimatedOutputChars = 0;
            const decoder = new TextDecoder();
            let buffer = "";

            const keepAliveInterval = setInterval(() => {
              try { res.write(": heartbeat\n\n"); } catch { }
            }, 15000);

            let hasTextBlock = false;
            let textBlockIndex: number | null = null;
            let textBlockClosed = false;
            let nextBlockIndex = 0;
            const toolCallState = new Map<number, { id: string; name: string; argsBuffer: string; blockIndex: number }>();
            let streamFinishReason = "end_turn";

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
                  const choiceDelta = chunk.choices?.[0]?.delta;
                  const finishReason = chunk.choices?.[0]?.finish_reason;

                  if (choiceDelta?.content) {
                    if (!hasTextBlock || textBlockClosed) {
                      hasTextBlock = true;
                      textBlockClosed = false;
                      const textIdx = nextBlockIndex++;
                      textBlockIndex = textIdx;
                      res.write(sseEvent("content_block_start", { type: "content_block_start", index: textIdx, content_block: { type: "text", text: "" } }));
                    }
                    res.write(sseEvent("content_block_delta", {
                      type: "content_block_delta", index: textBlockIndex!,
                      delta: { type: "text_delta", text: choiceDelta.content },
                    }));
                    estimatedOutputChars += choiceDelta.content.length;
                  }

                  if (choiceDelta?.tool_calls && Array.isArray(choiceDelta.tool_calls)) {
                    if (hasTextBlock && !textBlockClosed && textBlockIndex !== null) {
                      res.write(sseEvent("content_block_stop", { type: "content_block_stop", index: textBlockIndex }));
                      textBlockClosed = true;
                    }

                    for (const tc of choiceDelta.tool_calls) {
                      const tcIdx = tc.index ?? 0;

                      if (tc.id) {
                        const blockIndex = nextBlockIndex++;
                        toolCallState.set(tcIdx, { id: tc.id, name: tc.function?.name ?? "", argsBuffer: tc.function?.arguments ?? "", blockIndex });
                        res.write(sseEvent("content_block_start", {
                          type: "content_block_start", index: blockIndex,
                          content_block: { type: "tool_use", id: tc.id, name: tc.function?.name ?? "", input: {} },
                        }));
                        if (tc.function?.arguments) {
                          res.write(sseEvent("content_block_delta", {
                            type: "content_block_delta", index: blockIndex,
                            delta: { type: "input_json_delta", partial_json: tc.function.arguments },
                          }));
                        }
                      } else if (toolCallState.has(tcIdx)) {
                        const state = toolCallState.get(tcIdx)!;
                        if (tc.function?.arguments) {
                          state.argsBuffer += tc.function.arguments;
                          res.write(sseEvent("content_block_delta", {
                            type: "content_block_delta", index: state.blockIndex,
                            delta: { type: "input_json_delta", partial_json: tc.function.arguments },
                          }));
                        }
                      }
                    }
                  }

                  if (finishReason) {
                    streamFinishReason = finishReason === "tool_calls" ? "tool_use" : finishReason === "stop" ? "end_turn" : "end_turn";
                  }

                  if (chunk.usage) {
                    actualInputTokens = chunk.usage.prompt_tokens ?? actualInputTokens;
                    actualOutputTokens = chunk.usage.completion_tokens ?? actualOutputTokens;
                    actualCachedTokens = extractCachedTokens(chunk.usage) || actualCachedTokens;
                  }
                } catch {
                  clearInterval(keepAliveInterval);
                  logger.error({ provider: provider.id, data: raw.slice(0, 500) }, "Generic provider returned malformed SSE data");
                  updateApiRequestLog(res, { errorType: "upstream_malformed_stream" });
                  streamSession?.sendError("Upstream provider returned an invalid streaming response");
                  return;
                }
              }
            }
            clearInterval(keepAliveInterval);

            const finalInput = actualInputTokens;
            const finalOutput = actualOutputTokens || Math.min(Math.ceil(estimatedOutputChars / 4), FALLBACK_MAX_TOKENS);

            if (hasTextBlock && !textBlockClosed && textBlockIndex !== null) {
              res.write(sseEvent("content_block_stop", { type: "content_block_stop", index: textBlockIndex }));
              textBlockClosed = true;
            }

            for (const [, tc] of toolCallState) {
              res.write(sseEvent("content_block_stop", { type: "content_block_stop", index: tc.blockIndex }));
            }

            res.write(sseEvent("message_delta", {
              type: "message_delta",
              delta: { stop_reason: streamFinishReason, stop_sequence: null },
              usage: { output_tokens: finalOutput },
            }));
            res.write(sseEvent("message_stop", { type: "message_stop" }));
            res.end();
            streamSession?.close();

            const tokens = (finalInput + finalOutput) || estimateFallbackTokens(req.body);
            if (actualInputTokens + actualOutputTokens === 0) {
              logger.warn({ model: originalModel, fallbackTokens: tokens, estimatedChars: estimatedOutputChars }, "Generic stream: usage missing, using estimate");
            }
            const breakdown = (finalInput + finalOutput > 0)
              ? { inputTokens: finalInput, outputTokens: finalOutput, cachedTokens: actualCachedTokens }
              : undefined;
            updateApiRequestUsageLog(res, tokens, originalModel, breakdown, !!reservation?.tokenPackageId);
            reservationClosed = await finalizeReservation(reservation, tokens, originalModel, breakdown);
            if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          } else {
            const contentType = upstream.headers.get("content-type") ?? "";
            if (!contentType.includes("application/json")) {
              const text = await upstream.text();
              logger.error({ provider: provider.id, status: upstream.status, body: text.slice(0, 500) }, "Provider returned non-JSON");
              updateApiRequestLog(res, { errorType: "upstream_non_json" });
              res.status(502).json({ type: "error", error: { type: "api_error", message: `Upstream error (${upstream.status})${upstreamBodySnippet(text)}` } });
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
            const cachedTokens = extractCachedTokens(data.usage);
            const tokens = (inputTokens + outputTokens) || estimateFallbackTokens(req.body);
            const breakdown = (inputTokens + outputTokens > 0)
              ? { inputTokens, outputTokens, cachedTokens }
              : undefined;
            updateApiRequestUsageLog(res, tokens, originalModel, breakdown, !!reservation?.tokenPackageId);
            reservationClosed = await finalizeReservation(reservation, tokens, originalModel, breakdown);
            if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          }
          return;
        }
      } catch (err: any) {
        const errorCode = err?.cause?.code ?? err?.code;
        logger.error({ err, provider: provider.id, errorCode }, "Messages proxy error");
        markCooldown(provider);
        if (attempt >= providers.length - 1) {
          updateApiRequestLog(res, { errorType: errorCode === "UND_ERR_HEADERS_TIMEOUT" ? "upstream_headers_timeout" : "upstream_error" });
          if (!res.headersSent) {
            res.status(502).json({ type: "error", error: { type: "api_error", message: "All upstream providers failed" } });
          } else if (isStream) {
            try { res.write(sseEvent("error", { type: "error", error: { type: "api_error", message: "All upstream providers failed or timed out" } })); } catch { }
          }
          return;
        }
      }
    }
  } finally {
    streamSession?.close();
    if (!reservationClosed) await refundUnfinalizedReservation(reservation);
  }
}
