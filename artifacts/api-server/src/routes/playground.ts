import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { apiKeysTable, db } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { decryptSecret } from "../lib/secret-box";
import { getConfiguredPublicModelCatalog } from "./v1-proxy";

const router = Router();

router.post("/playground/chat", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { keyId, model, system, prompt, temperature = 0.7, maxTokens = 1024 } = req.body ?? {};
  if (!Number.isInteger(keyId) || typeof model !== "string" || !model.trim() || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "Konfigurasi playground tidak valid" }); return;
  }
  if (typeof temperature !== "number" || temperature < 0 || temperature > 2 || !Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 16384) {
    res.status(400).json({ error: "Parameter model tidak valid" }); return;
  }

  const [key] = await db.select().from(apiKeysTable).where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.userId, user.id), eq(apiKeysTable.isActive, true)));
  const fullKey = decryptSecret(key?.keyPlain);
  if (!key || !fullKey) { res.status(400).json({ error: "Pilih API key aktif yang dapat digunakan" }); return; }

  const port = Number(process.env.PORT ?? 3000);
  const startedAt = Date.now();
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(": connected\n\n");
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 10_000);
  const send = (event: "result" | "error", data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  try {
    const upstream = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${fullKey}` },
      body: JSON.stringify({
        model: model.trim(), temperature, max_tokens: maxTokens,
        stream: true, stream_options: { include_usage: true },
        messages: [
          ...(typeof system === "string" && system.trim() ? [{ role: "system", content: system.trim() }] : []),
          { role: "user", content: prompt.trim() },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => "");
      let errMsg = `Proxy error (${upstream.status})`;
      try { const j = JSON.parse(errBody); errMsg = j.error?.message ?? j.error ?? errMsg; } catch {}
      console.error("[Playground] Proxy returned non-OK:", upstream.status, errBody.slice(0, 500));
      send("error", { error: { message: errMsg } });
      return;
    }

    // Read SSE stream and accumulate content + usage
    const reader = upstream.body?.getReader();
    if (!reader) { send("error", { error: { message: "Tidak ada body dari proxy" } }); return; }

    const decoder = new TextDecoder();
    let sseBuf = "";
    let content = "";
    let finishReason: string | null = null;
    let usage: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuf += decoder.decode(value, { stream: true });

      const lines = sseBuf.split("\n");
      sseBuf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
        try {
          const chunk = JSON.parse(line.slice(6));
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) content += delta.content;
          if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
          if (chunk.usage) usage = chunk.usage;
        } catch { /* skip malformed chunk */ }
      }
    }

    if (!content && !usage) {
      console.error("[Playground] Stream ended with no content and no usage. Buffer remnant:", sseBuf.slice(0, 300));
    }

    const inputTokens = Number(usage?.prompt_tokens ?? 0);
    const outputTokens = Number(usage?.completion_tokens ?? 0);
    const catalog = await getConfiguredPublicModelCatalog();
    const pricing = catalog.find((entry) => entry.id === model)?.pricing;
    const credits = pricing ? Math.max(1, Math.ceil((inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000)) : null;
    send("result", {
      content,
      model,
      finishReason,
      usage: { inputTokens, outputTokens, totalTokens: Number(usage?.total_tokens ?? inputTokens + outputTokens), credits },
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    send("error", { error: "Playground gagal menghubungi AI proxy" });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

export default router;
