export type ModelProvider = "Anthropic" | "OpenAI" | "Zhipu AI" | "MiniMax" | "Moonshot AI";

export interface ModelPricing {
  input: number;
  output: number;
}

export interface ModelCatalogEntry {
  id: string;
  label: string;
  provider: ModelProvider;
  /** Credits charged per 1 million tokens. */
  pricing: ModelPricing;
  context: string;
  note?: string;
  description: string;
  aliases?: string[];
}

export const MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  // ── Claude Haiku ──────────────────────────────────────────────────────────
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    pricing: { input: 2500, output: 10000 },
    context: "1M",
    description: "Model Claude paling ringan dan cepat. Ideal untuk tugas sederhana dengan biaya minimal.",
  },
  // ── Claude Sonnet ─────────────────────────────────────────────────────────
  {
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    provider: "Anthropic",
    pricing: { input: 5000, output: 25000 },
    context: "1M",
    description: "Sonnet generasi terbaru. Keseimbangan antara kecepatan dan kecerdasan.",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    pricing: { input: 6500, output: 32500 },
    context: "1M",
    description: "Model cerdas dan cepat, cocok untuk mayoritas use-case.",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5.0",
    provider: "Anthropic",
    pricing: { input: 9500, output: 47500 },
    context: "1M",
    note: "Terbaru",
    description: "Generasi ke-5 Sonnet dengan pemahaman logika lebih kuat.",
  },
  // ── Claude Opus ───────────────────────────────────────────────────────────
  {
    id: "claude-opus-4-5",
    label: "Claude Opus 4.5",
    provider: "Anthropic",
    pricing: { input: 11000, output: 55000 },
    context: "1M",
    description: "Opus generasi pertama seri ke-4. Sangat kuat untuk tugas kompleks.",
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    provider: "Anthropic",
    pricing: { input: 14000, output: 70000 },
    context: "1M",
    description: "Model kuat dari Anthropic untuk tugas yang sangat kompleks.",
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    provider: "Anthropic",
    pricing: { input: 18000, output: 90000 },
    context: "1M",
    description: "Versi pembaruan Opus dengan stabilitas reasoning lebih baik.",
  },
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    provider: "Anthropic",
    pricing: { input: 22000, output: 110000 },
    context: "1M",
    note: "Terbaru",
    description: "Iterasi terbaru Opus. Kecepatan dan kecerdasan maksimal.",
  },
  // ── Claude Fable ──────────────────────────────────────────────────────────
  {
    id: "claude-fable-5",
    label: "Claude Fable 5",
    provider: "Anthropic",
    pricing: { input: 36400, output: 182000 },
    context: "1M",
    note: "Baru",
    description: "Model Claude terbaru generasi ke-5 dengan kemampuan penalaran tingkat lanjut.",
  },
  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id: "gpt-5-4",
    label: "GPT 5.4",
    provider: "OpenAI",
    pricing: { input: 6800, output: 40800 },
    context: "1M",
    description: "Standar industri. Performa sangat baik untuk berbagai tugas.",
    aliases: ["gpt-5.4"],
  },
  {
    id: "gpt-5-5",
    label: "GPT 5.5",
    provider: "OpenAI",
    pricing: { input: 13520, output: 79920 },
    context: "1M",
    description: "Peningkatan dari seri GPT-5. Respons lebih cepat dan lebih patuh instruksi.",
    aliases: ["gpt-5.5"],
  },
  {
    id: "gpt-5-5-pro",
    label: "GPT 5.5 Pro",
    provider: "OpenAI",
    pricing: { input: 15000, output: 90000 },
    context: "1M",
    note: "Baru",
    description: "Varian pro GPT-5.5 dengan kemampuan penalaran dan instruksi yang lebih kuat.",
    aliases: ["gpt-5.5-pro"],
  },
  {
    id: "gpt-5-6-luna",
    label: "GPT 5.6 Luna",
    provider: "OpenAI",
    pricing: { input: 3200, output: 19500 },
    context: "1M",
    note: "Baru",
    description: "Generasi ke-6 seri GPT. Model ringan dan efisien untuk tugas sehari-hari.",
    aliases: ["gpt-5.6-luna"],
  },
  {
    id: "gpt-5-6-terra",
    label: "GPT 5.6 Terra",
    provider: "OpenAI",
    pricing: { input: 8200, output: 49000 },
    context: "1M",
    note: "Baru",
    description: "GPT-5.6 varian Terra. Keseimbangan optimal antara kemampuan dan biaya.",
    aliases: ["gpt-5.6-terra"],
  },
  {
    id: "gpt-5-6-sol",
    label: "GPT 5.6 Sol",
    provider: "OpenAI",
    pricing: { input: 16500, output: 98000 },
    context: "1M",
    note: "Baru",
    description: "Flagship GPT-5.6. Performa penalaran tertinggi di seri ke-6.",
    aliases: ["gpt-5.6-sol"],
  },
  // ── Zhipu AI ──────────────────────────────────────────────────────────────
  {
    id: "glm-5-2",
    label: "GLM 5.2",
    provider: "Zhipu AI",
    pricing: { input: 4700, output: 15000 },
    context: "1M",
    description: "Model open-weight terkemuka dengan efisiensi biaya luar biasa.",
    aliases: ["glm-5.2"],
  },
  // ── MiniMax ───────────────────────────────────────────────────────────────
  {
    id: "MiniMaxAI/MiniMax-M2.7",
    label: "MiniMax M2.7",
    provider: "MiniMax",
    pricing: { input: 3200, output: 9800 },
    context: "1M",
    note: "Baru",
    description: "Model chat & coding umum dari MiniMax, harga efisien untuk tugas sehari-hari.",
  },
  // ── Moonshot AI ───────────────────────────────────────────────────────────
  {
    id: "moonshotai/Kimi-K2.6",
    label: "Kimi K2.6",
    provider: "Moonshot AI",
    pricing: { input: 3800, output: 11500 },
    context: "1M",
    note: "Baru",
    description: "Model dari Moonshot AI yang unggul untuk long-context dan reasoning.",
  },
];

export const DEFAULT_MODEL_ID = "claude-opus-4-8";
export const DEFAULT_MODEL_PRICING: ModelPricing = { input: 4700, output: 15000 };
export const AVAILABLE_MODEL_IDS = MODEL_CATALOG.map((model) => model.id);

function normalizeModelId(model: string): string {
  return model.toLowerCase().replace(/[-_.:/]/g, "");
}

export function getModelById(modelId: string): ModelCatalogEntry | undefined {
  const normalized = normalizeModelId(modelId);
  return MODEL_CATALOG.find((model) => {
    if (normalizeModelId(model.id) === normalized) return true;
    return model.aliases?.some((alias) => normalizeModelId(alias) === normalized) ?? false;
  });
}

export function getModelPricing(modelId: string): ModelPricing {
  const exact = getModelById(modelId);
  if (exact) return exact.pricing;

  const normalized = normalizeModelId(modelId);
  const sorted = [...MODEL_CATALOG].sort((a, b) => b.id.length - a.id.length);
  for (const model of sorted) {
    if (normalized.includes(normalizeModelId(model.id))) return model.pricing;
    if (model.aliases?.some((alias) => normalized.includes(normalizeModelId(alias)))) {
      return model.pricing;
    }
  }

  return DEFAULT_MODEL_PRICING;
}

export function groupModelsByProvider(models: readonly ModelCatalogEntry[] = MODEL_CATALOG) {
  return models.reduce<Record<ModelProvider, ModelCatalogEntry[]>>(
    (acc, model) => {
      acc[model.provider].push(model);
      return acc;
    },
    { Anthropic: [], OpenAI: [], "Zhipu AI": [], MiniMax: [], "Moonshot AI": [] },
  );
}
