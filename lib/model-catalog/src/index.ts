export type ModelProvider = "Anthropic" | "OpenAI" | "Zhipu AI";

export interface ModelPricing {
  input: number;
  output: number;
}

export interface ModelCatalogEntry {
  id: string;
  label: string;
  provider: ModelProvider;
  pricing: ModelPricing;
  context: string;
  note?: string;
  description: string;
  aliases?: string[];
}

export const MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    provider: "Anthropic",
    pricing: { input: 180, output: 900 },
    context: "200K",
    description: "Model kuat dari Anthropic untuk tugas yang sangat kompleks.",
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    provider: "Anthropic",
    pricing: { input: 180, output: 900 },
    context: "200K",
    description: "Versi pembaruan Opus dengan stabilitas reasoning lebih baik.",
  },
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    provider: "Anthropic",
    pricing: { input: 225, output: 1080 },
    context: "200K",
    note: "Terbaru",
    description: "Iterasi terbaru Opus. Kecepatan dan kecerdasan maksimal.",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    pricing: { input: 45, output: 200 },
    context: "200K",
    description: "Model cerdas dan cepat, cocok untuk mayoritas use-case.",
  },
  {
    id: "claude-sonnet-4-7",
    label: "Claude Sonnet 4.7",
    provider: "Anthropic",
    pricing: { input: 45, output: 200 },
    context: "200K",
    description: "Keseimbangan ideal antara kecepatan, harga, dan kecerdasan.",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5.0",
    provider: "Anthropic",
    pricing: { input: 50, output: 250 },
    context: "200K",
    note: "Terbaru",
    description: "Generasi ke-5 Sonnet dengan pemahaman logika lebih kuat.",
  },
  {
    id: "gpt-5-4",
    label: "GPT 5.4",
    provider: "OpenAI",
    pricing: { input: 100, output: 300 },
    context: "128K",
    description: "Standar industri. Performa sangat baik untuk berbagai tugas.",
    aliases: ["gpt-5.4"],
  },
  {
    id: "gpt-5-5",
    label: "GPT 5.5",
    provider: "OpenAI",
    pricing: { input: 150, output: 400 },
    context: "128K",
    note: "Terbaru",
    description: "Peningkatan dari seri GPT-5. Respons lebih cepat dan lebih patuh instruksi.",
    aliases: ["gpt-5.5"],
  },
  {
    id: "glm-5-2",
    label: "GLM 5.2",
    provider: "Zhipu AI",
    pricing: { input: 10, output: 40 },
    context: "128K",
    description: "Model open-weight terkemuka dengan efisiensi biaya luar biasa.",
    aliases: ["glm-5.2"],
  },
];

export const DEFAULT_MODEL_ID = "claude-opus-4-8";
export const DEFAULT_MODEL_PRICING: ModelPricing = { input: 10, output: 30 };
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
    { Anthropic: [], OpenAI: [], "Zhipu AI": [] },
  );
}
