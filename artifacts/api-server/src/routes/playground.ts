import { Router } from "express";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { apiKeysTable, playgroundSessionsTable, db } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { decryptSecret } from "../lib/secret-box";
import { getConfiguredPublicModelCatalog } from "./v1-proxy";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import zlib from "zlib";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });


const router = Router();

function decodeBingUrl(rawUrl: string): string {
  try {
    const uMatch = /u=a1([a-zA-Z0-9+/=_-]+)/.exec(rawUrl);
    if (uMatch) {
      let b64 = uMatch[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      if (decoded.startsWith("http")) return decoded;
    }
  } catch {}
  return rawUrl;
}

async function searchCrossref(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  try {
    const res = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query.trim())}&rows=4`, {
      headers: { "User-Agent": "MutionApp/1.0 (mailto:admin@mution.tech)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const items = data.message?.items || [];
    return items.map((it: any) => {
      const title = it.title?.[0] || "Publikasi Ilmiah";
      const doi = it.DOI;
      const url = it.URL || (doi ? `https://doi.org/${doi}` : "");
      const journal = it["container-title"]?.[0] || it.publisher || "";
      const year = it.issued?.["date-parts"]?.[0]?.[0] || it.created?.["date-parts"]?.[0]?.[0] || "";
      const snippet = `Jurnal: ${journal}${year ? ` (${year})` : ""}${doi ? ` | DOI: ${doi}` : ""}`;
      return { title, snippet, url };
    }).filter((it: any) => it.url);
  } catch (err) {
    console.error("[Playground] Crossref search error:", err);
    return [];
  }
}

async function searchOpenAlex(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  try {
    const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query.trim())}&per-page=4`, {
      headers: { "User-Agent": "MutionApp/1.0 (mailto:admin@mution.tech)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const results = data.results || [];
    return results.map((it: any) => {
      const title = it.title || "Karya Ilmiah";
      const url = it.doi || it.primary_location?.landing_page_url || "";
      const venue = it.primary_location?.source?.display_name || "";
      const year = it.publication_year ? ` (${it.publication_year})` : "";
      const snippet = `Sumber: ${venue}${year}${it.doi ? ` | DOI: ${it.doi}` : ""}`;
      return { title, snippet, url };
    }).filter((it: any) => it.url);
  } catch (err) {
    console.error("[Playground] OpenAlex search error:", err);
    return [];
  }
}

async function searchWebBing(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  try {
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query.trim())}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const items: Array<{ title: string; snippet: string; url: string }> = [];
    const regex = /<li class="b_algo"[\s\S]*?<h2><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<div class="b_caption">([\s\S]*?)<\/div>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null && items.length < 5) {
      const rawUrl = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      const snippet = match[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const url = decodeBingUrl(rawUrl);
      if (url && (title || snippet)) {
        items.push({ title, snippet, url });
      }
    }
    return items;
  } catch (err) {
    console.error("[Playground] Gagal melakukan web search:", err);
    return [];
  }
}

async function extractSearchIntent(
  userText: string,
  port: number,
  authKey: string,
  model: string
): Promise<{ query: string; isAcademic: boolean; shouldSearch: boolean }> {
  const academicKeywords = /\b(jurnal|journal|paper|artikel ilmiah|skripsi|tesis|penelitian|referensi|doi|buku|ebook|daftar pustaka)\b/i;
  const isAcademicHeuristic = academicKeywords.test(userText);

  // Fast check for greetings or short conversational text
  const trimmed = userText.trim();
  if (/^(halo|hai|p|tes|test|pagi|siang|malam|apa kabar|assalamualaikum)\b/i.test(trimmed)) {
    return { query: "", isAcademic: false, shouldSearch: false };
  }
  if (trimmed.length < 40 && /\b(bisa|mampu|bisa gak|bisa ga)\b/i.test(trimmed) && !trimmed.toLowerCase().includes("ini")) {
    return { query: "", isAcademic: false, shouldSearch: false };
  }

  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authKey}` },
      body: JSON.stringify({
        model: model.trim(),
        temperature: 0.1,
        max_tokens: 80,
        stream: false,
        messages: [
          {
            role: "system",
            content: `Kamu adalah asisten pengoptimal query pencarian.
Analisis pesan pengguna berikut.
Format balasanmu HANYA JSON satu baris:
{"query": "kata kunci pencarian", "isAcademic": true/false, "shouldSearch": true/false}
Aturan:
1. Buang semua kata percakapan seperti 'kamu bisa cariin', 'tolong carikan', 'kalo', 'buat skripsi saya', dll.
2. Buat kata kunci bersih 2-6 kata spesifik yang paling relevan.
3. Set isAcademic=true jika pengguna mencari jurnal, penelitian terdahulu, artikel ilmiah, buku ilmiah, atau referensi skripsi.
4. Set shouldSearch=false jika pengguna hanya menyapa, basa-basi, atau bertanya apakah kamu bisa melakukan sesuatu tanpa meminta data nyata.`
          },
          { role: "user", content: userText.slice(0, 500) }
        ]
      }),
      signal: AbortSignal.timeout(3500)
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const raw = data?.choices?.[0]?.message?.content?.trim() || "";
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.query === "string" && parsed.query.trim()) {
          return {
            query: parsed.query.trim(),
            isAcademic: Boolean(parsed.isAcademic ?? isAcademicHeuristic),
            shouldSearch: parsed.shouldSearch !== false
          };
        }
      }
    }
  } catch (err) {
    console.warn("[Playground] AI query extractor fallback:", err);
  }

  // Heuristic cleanup fallback
  let cleaned = userText
    .replace(/^(halo|hai|tolong|coba|bisa|bisakah|kamu|mohon|kalo|kalau|saya|mau|minta|cariin|carikan|tolong carikan|bisa carikan)\s+/gi, "")
    .replace(/\b(sumber|ebook|buku|untuk|yg|yang|berdekatan|dengan|judul|skripsiku|skripsi|ga|gak|nggak|dong|ya|yah|sih|deh|kah|nih|tuh|kan|sebagai|penelitian|terdahulu|referensi)\b/gi, " ")
    .replace(/[?!,.:;()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    query: cleaned.slice(0, 100) || userText.slice(0, 100),
    isAcademic: isAcademicHeuristic,
    shouldSearch: true
  };
}

router.post("/playground/chat", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { keyId, model, messages, webSearch } = req.body ?? {};
  if (!Number.isInteger(keyId) || typeof model !== "string" || !model.trim() || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Konfigurasi playground tidak valid" }); return;
  }

  // Parse and normalize temperature (tolerant to comma or string)
  let rawTemp = req.body?.temperature;
  let tempVal = typeof rawTemp === "number" ? rawTemp : parseFloat(String(rawTemp ?? "").replace(",", "."));
  if (isNaN(tempVal)) tempVal = 0.7;
  if (tempVal < 0 || tempVal > 2) {
    res.status(400).json({ error: "Parameter temperature harus antara 0 dan 2" }); return;
  }

  // Parse and normalize maxTokens (tolerant to string or null, default 8192, up to 65536)
  let rawTokens = req.body?.maxTokens;
  let tokensVal = typeof rawTokens === "number" ? Math.floor(rawTokens) : parseInt(String(rawTokens ?? ""), 10);
  if (isNaN(tokensVal) || tokensVal <= 0) tokensVal = 8192;
  if (tokensVal < 1 || tokensVal > 65536) {
    res.status(400).json({ error: "Parameter maxTokens harus antara 1 dan 65536" }); return;
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
    let finalMessages = [...messages];
    if (webSearch) {
      // Find latest user query
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
      let rawQueryText = "";
      if (typeof lastUserMsg?.content === "string") {
        rawQueryText = lastUserMsg.content;
      } else if (Array.isArray(lastUserMsg?.content)) {
        const textPart = lastUserMsg.content.find((p: any) => p.type === "text");
        rawQueryText = textPart?.text || "";
      }

      if (rawQueryText.trim()) {
        const intent = await extractSearchIntent(rawQueryText, port, fullKey, model);

        if (intent.shouldSearch && intent.query.trim()) {
          console.log(`[Playground Search] Query: "${intent.query}", Academic: ${intent.isAcademic}`);
          let searchItems: Array<{ title: string; snippet: string; url: string }> = [];

          if (intent.isAcademic) {
            // Search academic databases (OpenAlex + Crossref + Bing Scholar) in parallel
            const [openAlexItems, crossrefItems, bingItems] = await Promise.all([
              searchOpenAlex(intent.query),
              searchCrossref(intent.query),
              searchWebBing(`jurnal ${intent.query}`),
            ]);
            searchItems = [...openAlexItems, ...crossrefItems, ...bingItems.slice(0, 3)];
          } else {
            // General web search via Bing
            searchItems = await searchWebBing(intent.query);
          }

          if (searchItems.length > 0) {
            const label = intent.isAcademic ? "DATABASE JURNAL & REFERENSI ILMIAH RESMI" : "HASIL PENCARIAN WEB REAL-TIME";
            const searchContext = [
              `[${label} UNTUK: "${intent.query}"]`,
              ...searchItems.map((r, i) => `[${i + 1}] Judul/Sumber: ${r.title}\nURL / DOI: ${r.url}\nKeterangan: ${r.snippet}`),
              `\nInstruksi Penting: Gunakan data di atas untuk menjawab pengguna secara akurat dan up-to-date. WAJIB cantumkan tautan/link URL atau DOI yang valid dari data di atas (format markdown link: [Nama Sumber/Judul](URL)) agar pengguna dapat langsung mengklik dan membuka sumbernya.`
            ].join("\n\n");

            if (finalMessages.length > 0 && finalMessages[0].role === "system") {
              finalMessages[0] = {
                ...finalMessages[0],
                content: `${finalMessages[0].content}\n\n${searchContext}`
              };
            } else {
              finalMessages = [
                { role: "system", content: searchContext },
                ...finalMessages
              ];
            }
          }
        }
      }
    }

    const upstream = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${fullKey}` },
      body: JSON.stringify({
        model: model.trim(), temperature: tempVal, max_tokens: tokensVal,
        stream: true, stream_options: { include_usage: true },
        messages: finalMessages,
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
          const message = chunk.choices?.[0]?.message;
          const text = delta?.content ?? message?.content;
          if (text) content += text;
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

// Get all sessions
router.get("/playground/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  try {
    const sessions = await db
      .select({ id: playgroundSessionsTable.id, title: playgroundSessionsTable.title, updatedAt: playgroundSessionsTable.updatedAt })
      .from(playgroundSessionsTable)
      .where(eq(playgroundSessionsTable.userId, user.id))
      .orderBy(desc(playgroundSessionsTable.updatedAt));
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil sesi" });
  }
});

// Get specific session
router.get("/playground/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  try {
    const [session] = await db
      .select()
      .from(playgroundSessionsTable)
      .where(and(eq(playgroundSessionsTable.id, Number(req.params.id)), eq(playgroundSessionsTable.userId, user.id)));
    if (!session) { res.status(404).json({ error: "Sesi tidak ditemukan" }); return; }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil sesi" });
  }
});

function extractStorageFileNames(messages: any): string[] {
  if (!messages) return [];
  const text = typeof messages === "string" ? messages : JSON.stringify(messages);
  const regex = /\/playground\/([^/?#\s"'\\]+)/g;
  const files = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      try {
        files.add(decodeURIComponent(match[1]));
      } catch {
        files.add(match[1]);
      }
    }
  }
  return Array.from(files);
}

async function deleteFilesFromStorage(fileNames: string[]): Promise<void> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || fileNames.length === 0) return;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.storage.from("playground").remove(fileNames);
    if (error) {
      console.error("[Playground] Gagal menghapus file dari storage:", error);
    } else {
      console.log(`[Playground] Berhasil menghapus ${fileNames.length} file dari storage:`, fileNames);
    }
  } catch (err) {
    console.error("[Playground] Error saat menghapus file storage:", err);
  }
}

// Create new session
router.post("/playground/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { title = "Obrolan Baru", model, systemPrompt, temperature = "0.7", maxTokens = "8192", keyId } = req.body;
  
  try {
    // Limit to 5 sessions max per user
    const countRes = await db.select({ count: sql`count(*)` }).from(playgroundSessionsTable).where(eq(playgroundSessionsTable.userId, user.id));
    const count = Number(countRes[0].count);
    if (count >= 5) {
      // Find the oldest sessions to delete and clean up storage files
      const oldest = await db
        .select({ id: playgroundSessionsTable.id, messages: playgroundSessionsTable.messages })
        .from(playgroundSessionsTable)
        .where(eq(playgroundSessionsTable.userId, user.id))
        .orderBy(asc(playgroundSessionsTable.updatedAt))
        .limit(count - 4);
      for (const oldSession of oldest) {
        const fileNames = extractStorageFileNames(oldSession.messages);
        if (fileNames.length > 0) {
          await deleteFilesFromStorage(fileNames);
        }
        await db.delete(playgroundSessionsTable).where(and(eq(playgroundSessionsTable.userId, user.id), eq(playgroundSessionsTable.id, oldSession.id)));
      }
    }

    const [newSession] = await db.insert(playgroundSessionsTable).values({
      userId: user.id,
      title,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      apiKeyId: keyId,
      messages: [],
    }).returning();
    
    res.json(newSession);
  } catch (error) {
    res.status(500).json({ error: "Gagal membuat sesi" });
  }
});

// Update session (saves messages)
router.put("/playground/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { title, model, systemPrompt, temperature, maxTokens, messages, keyId } = req.body;
  
  try {
    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (model !== undefined) updateData.model = model;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (messages !== undefined) updateData.messages = messages;
    if (keyId !== undefined) updateData.apiKeyId = keyId;

    const [updated] = await db.update(playgroundSessionsTable)
      .set(updateData)
      .where(and(eq(playgroundSessionsTable.id, Number(req.params.id)), eq(playgroundSessionsTable.userId, user.id)))
      .returning();
      
    if (!updated) { res.status(404).json({ error: "Sesi tidak ditemukan" }); return; }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Gagal menyimpan sesi" });
  }
});

// Delete session (and any uploaded files in Supabase storage for this session)
router.delete("/playground/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  try {
    const [session] = await db
      .select({ id: playgroundSessionsTable.id, messages: playgroundSessionsTable.messages })
      .from(playgroundSessionsTable)
      .where(and(eq(playgroundSessionsTable.id, Number(req.params.id)), eq(playgroundSessionsTable.userId, user.id)));

    if (session) {
      const fileNames = extractStorageFileNames(session.messages);
      if (fileNames.length > 0) {
        await deleteFilesFromStorage(fileNames);
      }
      await db.delete(playgroundSessionsTable)
        .where(and(eq(playgroundSessionsTable.id, Number(req.params.id)), eq(playgroundSessionsTable.userId, user.id)));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Gagal menghapus sesi" });
  }
});

// Delete single file from storage (e.g. cancelled attachment before send)
router.delete("/playground/files", requireAuth, async (req, res): Promise<void> => {
  const { url } = req.body ?? {};
  if (typeof url === "string" && url.trim()) {
    const fileNames = extractStorageFileNames([url]);
    if (fileNames.length > 0) {
      await deleteFilesFromStorage(fileNames);
    }
  }
  res.json({ success: true });
});

function extractTextFromDocx(buf: Buffer): string {
  try {
    let offset = 0;
    while (offset < buf.length - 4) {
      if (buf.readUInt32LE(offset) === 0x04034b50) {
        const compMethod = buf.readUInt16LE(offset + 8);
        const compSize = buf.readUInt32LE(offset + 18);
        const fnLen = buf.readUInt16LE(offset + 26);
        const extraLen = buf.readUInt16LE(offset + 28);
        const fn = buf.toString("utf8", offset + 30, offset + 30 + fnLen);
        const dataStart = offset + 30 + fnLen + extraLen;
        if (fn === "word/document.xml") {
          const compData = buf.subarray(dataStart, dataStart + compSize);
          const xml = (compMethod === 8 ? zlib.inflateRawSync(compData) : compData).toString("utf8");

          const paragraphs: string[] = [];
          const pRegex = /<w:p(?: [^>]*)?>(.*?)<\/w:p>/gs;
          let match: RegExpExecArray | null;
          while ((match = pRegex.exec(xml)) !== null) {
            const pXml = match[1];
            const tRegex = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
            let pText = "";
            let tMatch: RegExpExecArray | null;
            while ((tMatch = tRegex.exec(pXml)) !== null) {
              pText += tMatch[1];
            }
            if (pText.trim()) {
              paragraphs.push(pText.trim());
            }
          }

          return paragraphs.join("\n\n")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"');
        }
        offset = dataStart + compSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.error("Gagal ekstrak docx:", err);
  }
  return "";
}

function extractTextFromPdf(buf: Buffer): string {
  try {
    const content = buf.toString("latin1");
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    let fullText = "";

    while ((match = streamRegex.exec(content)) !== null) {
      const rawStream = Buffer.from(match[1], "latin1");
      let uncompressed: Buffer;
      try {
        uncompressed = zlib.inflateSync(rawStream);
      } catch {
        try {
          uncompressed = zlib.inflateRawSync(rawStream);
        } catch {
          uncompressed = rawStream;
        }
      }

      const textStream = uncompressed.toString("latin1");
      const btRegex = /BT[\s\S]*?ET/g;
      let btMatch: RegExpExecArray | null;
      while ((btMatch = btRegex.exec(textStream)) !== null) {
        const block = btMatch[0];
        const tjRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          fullText += tjMatch[1] + " ";
        }

        const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
        let arrMatch: RegExpExecArray | null;
        while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
          const inner = arrMatch[1];
          const innerStrings = /\(([^)]*)\)/g;
          let sMatch: RegExpExecArray | null;
          let line = "";
          while ((sMatch = innerStrings.exec(inner)) !== null) {
            line += sMatch[1];
          }
          fullText += line + " ";
        }
        fullText += "\n";
      }
    }

    return fullText
      .replace(/\\([()\\])/g, "$1")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, "\t")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim();
  } catch (err) {
    console.error("Gagal ekstrak pdf:", err);
    return "";
  }
}

function extractFileText(buf: Buffer, originalName: string, mimeType: string): string | undefined {
  const ext = (originalName.split(".").pop() ?? "").toLowerCase();

  if (ext === "docx" || mimeType.includes("wordprocessingml")) {
    const text = extractTextFromDocx(buf);
    if (text) return text.slice(0, 300_000);
  }

  if (ext === "pdf" || mimeType.includes("pdf")) {
    const text = extractTextFromPdf(buf);
    if (text) return text.slice(0, 300_000);
  }

  const textExts = ["txt", "md", "csv", "json", "yaml", "yml", "xml", "log", "sql", "py", "js", "ts", "tsx", "jsx", "html", "css", "sh", "env", "ini", "conf", "java", "c", "cpp", "cs", "go", "rs", "php", "rb"];
  if (textExts.includes(ext) || mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("javascript")) {
    try {
      const text = buf.toString("utf8");
      return text.slice(0, 300_000);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

// Upload file / attachment
router.post("/playground/upload", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "File tidak ditemukan" }); return; }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Konfigurasi storage belum lengkap di .env" }); return;
  }
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ext = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.round(Math.random()*1000)}.${ext}`;
    
    const { error } = await supabase.storage.from("playground").upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });
    
    if (error) throw error;
    
    const { data: publicData } = supabase.storage.from("playground").getPublicUrl(fileName);
    const textContent = extractFileText(req.file.buffer, req.file.originalname, req.file.mimetype);

    res.json({ 
      url: publicData.publicUrl,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      textContent: textContent || undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Gagal upload file" });
  }
});

export default router;
