import { logger } from "./logger";

export interface SearchResult {
  title: string;
  url?: string;
  snippet?: string;
  date?: string;
  source?: string;
}

const SEARCH_TRIGGER_PATTERNS = [
  /\b(cari|carikan|search|searching|browsing|browse|cek|lihat)\b/i,
  /\b(info|informasi|kabar|berita)\s+(terbaru|terkini|hari ini|update)\b/i,
  /\b(terbaru|terkini|hari ini|sekarang|saat ini)\b/i,
  /\b(latest|today|current|recent|breaking news|news)\b/i,
  /\b(harga|kurs|cuaca|gempa|skor|klasemen|jadwal)\b/i,
  /\b(apa yang terjadi|siapa pemenang|siapa yang menang|who won|what happened)\b/i,
];

export function shouldPerformWebSearch(prompt: string): boolean {
  if (!prompt || typeof prompt !== "string") return false;
  const trimmed = prompt.trim();
  if (trimmed.length < 3) return false;
  return SEARCH_TRIGGER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function extractSearchQuery(prompt: string): string {
  let cleaned = prompt.trim();
  // Strip instructions and suffixes
  cleaned = cleaned.replace(/sertakan\s+(link|tautan|sumber|url|web).*$/i, "");
  cleaned = cleaned.replace(/beserta\s+(link|tautan|sumber|url|web).*$/i, "");
  cleaned = cleaned.replace(/(dilain|selain)\s+itu.*$/i, "");
  cleaned = cleaned.replace(/(jangan|ga usah|tidak usah)\s+.*$/i, "");
  cleaned = cleaned.replace(/(coba\s+)?per\s+hari\s+ini.*$/i, "");
  cleaned = cleaned.replace(/tgl\s+\d+.*$/i, "");
  cleaned = cleaned.replace(/tanggal\s+\d+.*$/i, "");

  // Strip filler prefixes
  cleaned = cleaned.replace(/^(tolong|coba|bisakah kamu|bisakah|bisa|mohon|dong|plis)\s+/i, "");
  cleaned = cleaned.replace(/^(kamu\s+)?(cariin|carikan|cari|search|browsing|browse|cek|lihat)\s+(aku|saya|kami)?\s*(dong\s+|tentang\s+|mengenai\s+|soal\s+)?/i, "");
  cleaned = cleaned.replace(/^(informasi|info|berita|kabar)\s+(terbaru|terkini|hari ini|update)\s+(tentang|mengenai|soal)?\s*/i, "");
  cleaned = cleaned.replace(/\s+(dong|ya|yah|deh|nih|sih)\??$/i, "");
  cleaned = cleaned.trim();

  const lower = cleaned.toLowerCase();
  if (
    !cleaned ||
    lower === "info terbaru" ||
    lower === "informasi terbaru" ||
    lower === "berita terbaru" ||
    lower === "berita terkini" ||
    lower === "info" ||
    lower === "berita"
  ) {
    return "berita terkini hari ini";
  }

  // If very short keyword like "politik" or "gempa", append "terkini hari ini"
  if (cleaned.split(/\s+/).length <= 2 && !lower.includes("hari ini") && !lower.includes("terkini")) {
    return `${cleaned} terkini hari ini`;
  }

  return cleaned;
}

async function searchGoogleNewsRSS(query: string): Promise<SearchResult[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) return [];
  const xml = await res.text();
  const items = xml.split("<item>");
  const results: SearchResult[] = [];

  for (let i = 1; i < items.length && results.length < 6; i++) {
    const item = items[i];
    const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, "").trim();
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<[^>]+>/g, "").trim();

    if (title) {
      results.push({
        title,
        url: link,
        date: pubDate,
        source: source || "Google News",
      });
    }
  }

  return results;
}

async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MutionApp/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const titles: string[] = data[1] || [];
    const snippets: string[] = data[2] || [];
    const urls: string[] = data[3] || [];

    const results: SearchResult[] = [];
    for (let i = 0; i < titles.length; i++) {
      if (titles[i]) {
        results.push({
          title: titles[i],
          snippet: snippets[i] || "",
          url: urls[i] || "",
          source: "Wikipedia",
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as any;
  return (data.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
    source: "Web",
  }));
}

export async function executeWebSearch(query: string): Promise<SearchResult[]> {
  try {
    if (process.env.TAVILY_API_KEY) {
      const tavilyRes = await searchTavily(query, process.env.TAVILY_API_KEY);
      if (tavilyRes.length > 0) return tavilyRes;
    }

    let newsResults = await searchGoogleNewsRSS(query);
    if (newsResults.length === 0 && query.split(/\s+/).length > 2) {
      // Fallback with broader keywords
      const firstTwo = query.split(/\s+/).slice(0, 2).join(" ");
      newsResults = await searchGoogleNewsRSS(`${firstTwo} terkini hari ini`);
    }
    if (newsResults.length > 0) return newsResults;

    const wikiResults = await searchWikipedia(query);
    return wikiResults;
  } catch (err: any) {
    logger.error({ err: err?.message, query }, "Web search execution failed");
    return [];
  }
}

export function formatSearchResultsForContext(results: SearchResult[]): string {
  if (results.length === 0) return "";
  const now = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let text = `[HASIL PENCARIAN WEB TERKINI - ${now}]\n`;
  text += `Informasi langsung dari internet untuk membantu menjawab pertanyaan pengguna secara akurat dan up-to-date:\n\n`;

  results.forEach((r, idx) => {
    text += `${idx + 1}. **${r.title}**\n`;
    if (r.date) text += `   - Tanggal: ${r.date}\n`;
    if (r.source) text += `   - Sumber: ${r.source}\n`;
    if (r.snippet) text += `   - Ringkasan: ${r.snippet}\n`;
    if (r.url) text += `   - Tautan: ${r.url}\n`;
    text += "\n";
  });

  text += `--- Instruksi: Jawablah pertanyaan pengguna menggunakan informasi terkini di atas. Jangan katakan bahwa Anda tidak memiliki akses internet atau berjanji akan mengecek, melainkan langsung berikan informasi yang relevan di atas secara lugas dan informatif. ---`;

  return text.trim();
}

export async function enrichMessagesWithWebSearchIfNeeded(messages: any[]): Promise<{ messages: any[]; didSearch: boolean; query?: string }> {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages, didSearch: false };
  }

  // Find last user message
  let lastUserMsg: any = null;
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUserMsg = messages[i];
      lastUserIndex = i;
      break;
    }
  }

  if (!lastUserMsg) return { messages, didSearch: false };

  // Extract prompt text
  let promptText = "";
  if (typeof lastUserMsg.content === "string") {
    promptText = lastUserMsg.content;
  } else if (Array.isArray(lastUserMsg.content)) {
    for (const part of lastUserMsg.content) {
      if (part.type === "text" && part.text) promptText += part.text + " ";
    }
  }

  promptText = promptText.trim();
  if (!shouldPerformWebSearch(promptText)) {
    return { messages, didSearch: false };
  }

  const query = extractSearchQuery(promptText);
  logger.info({ prompt: promptText, query }, "[Playground] Executing auto web search");

  const results = await executeWebSearch(query);
  if (results.length === 0) {
    return { messages, didSearch: false, query };
  }

  const searchContext = formatSearchResultsForContext(results);

  // Clone messages and inject search context into the last user message
  const cloned = [...messages];
  const targetMsg = { ...cloned[lastUserIndex] };

  if (typeof targetMsg.content === "string") {
    targetMsg.content = `${searchContext}\n\n${targetMsg.content}`;
  } else if (Array.isArray(targetMsg.content)) {
    targetMsg.content = [
      { type: "text", text: searchContext },
      ...targetMsg.content,
    ];
  } else {
    targetMsg.content = `${searchContext}\n\n${String(targetMsg.content ?? "")}`;
  }

  cloned[lastUserIndex] = targetMsg;

  return { messages: cloned, didSearch: true, query };
}
