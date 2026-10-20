export type ApiRequestLogState = {
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
  /** Bagian dari promptTokens yang cache hit di provider — info saja, tidak memengaruhi credits. */
  cachedTokens?: number;
  credits?: number;
};

export type CreditBreakdown = {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
};

export type CreditReservation = {
  userId: number;
  keyId: number;
  credits: number;
  tokenPackageId?: number;
  tokenCategory?: "claude" | "gpt";
};

export interface Provider {
  id: string;
  cooldownId: string;
  openaiBase: string; // full base for OpenAI calls, e.g. "https://conduit.ozdoev.net/v1"
  apiKey: string;
  type: "conduit" | "generic";
}

export type ProviderModelConfig = {
  modelId: string;
  displayName: string;
  brandProvider: string;
  upstreamModelId: string;
  enabled: boolean;
  basePriceInput?: number | null;
  basePriceOutput?: number | null;
};

export type CachedPricingOverride = {
  mode: "default" | "discount_percent" | "fixed_price" | "free";
  discountPercent: number | null;
  inputPriceOverride: string | null;
  outputPriceOverride: string | null;
};

export interface UpstreamHealth {
  status: "Online" | "Degraded" | "Offline";
  latencyMs: number;
  lastChecked: number;
}

export const MAX_OUTPUT_TOKENS = 131_072;
export const DEFAULT_OUTPUT_TOKENS = 4_096;
export const FALLBACK_MAX_TOKENS = MAX_OUTPUT_TOKENS;
export const MODEL_PRICING_TOKEN_UNIT = 1_000_000;
export const PROVIDER_COOLDOWN_MS = 60_000;
export const PROVIDER_SETTINGS_REFRESH_MS = 5_000;
export const PRICING_OVERRIDES_REFRESH_MS = 10_000;
