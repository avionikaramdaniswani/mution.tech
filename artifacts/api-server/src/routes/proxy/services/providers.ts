import { db, aiProviderSettingsTable, aiProviderModelsTable, modelPricingOverridesTable } from "@workspace/db";
import { and, asc, eq, ne, notInArray } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "../../../lib/secret-box";
import { logger } from "../../../lib/logger";
import { MODEL_CATALOG, getModelPricing as getCatalogModelPricing } from "@workspace/model-catalog";
import type {
  Provider,
  ProviderModelConfig,
  CachedPricingOverride,
  UpstreamHealth,
} from "../types";
import {
  PROVIDER_COOLDOWN_MS,
  PROVIDER_SETTINGS_REFRESH_MS,
  PRICING_OVERRIDES_REFRESH_MS,
} from "../types";

export const _cooldowns = new Map<string, number>();
export const _disabledProviders = new Set<string>();
export const _providerModels = new Map<string, Map<string, ProviderModelConfig>>();
let _providerSettingsLoadedAt = 0;
let _providerSettingsRefresh: Promise<void> | null = null;

export const _modelPricingOverrides = new Map<string, CachedPricingOverride>();
let _pricingOverridesLoadedAt = 0;
let _pricingOverridesRefresh: Promise<void> | null = null;

let _cachedProviders: Provider[] = [];
export const _upstreamHealth = new Map<string, UpstreamHealth>();

export function buildOpenaiBase(rawUrl: string): string {
  const url = rawUrl.replace(/\/$/, "");
  if (url.endsWith("/v1")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return `${url}/v1`;
    }
  } catch { }
  return url;
}

export function detectType(url: string): Provider["type"] {
  if (url.includes("conduit.ozdoev.net")) return "conduit";
  return "generic";
}

export async function refreshModelPricingOverrides(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - _pricingOverridesLoadedAt < PRICING_OVERRIDES_REFRESH_MS) return;

  _pricingOverridesRefresh ??= (async () => {
    const rows = await db.select().from(modelPricingOverridesTable);
    _modelPricingOverrides.clear();
    for (const row of rows) {
      _modelPricingOverrides.set(row.modelId, {
        mode: row.mode,
        discountPercent: row.discountPercent ?? null,
        inputPriceOverride: row.inputPriceOverride ?? null,
        outputPriceOverride: row.outputPriceOverride ?? null,
      });
    }
    _pricingOverridesLoadedAt = Date.now();
  })().finally(() => {
    _pricingOverridesRefresh = null;
  });

  await _pricingOverridesRefresh;
}

export async function refreshProviderSettings(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - _providerSettingsLoadedAt < PROVIDER_SETTINGS_REFRESH_MS) return;

  _providerSettingsRefresh ??= (async () => {
    const rows = await db.select().from(aiProviderSettingsTable).orderBy(asc(aiProviderSettingsTable.priority));
    _disabledProviders.clear();
    const newProviders: Provider[] = [];
    for (const row of rows) {
      if (!row.enabled) _disabledProviders.add(row.id);
      if (row.baseUrl && row.apiKeyEncrypted) {
        const apiKey = decryptSecret(row.apiKeyEncrypted);
        if (apiKey) {
          newProviders.push({
            id: row.id,
            cooldownId: `${row.id}-0`,
            openaiBase: buildOpenaiBase(row.baseUrl),
            apiKey,
            type: (row.type as Provider["type"]) || "generic",
          });
        }

        if (row.backupApiKeysEncrypted && Array.isArray(row.backupApiKeysEncrypted)) {
          let idx = 1;
          for (const encryptedKey of row.backupApiKeysEncrypted) {
            const backupKey = decryptSecret(encryptedKey);
            if (backupKey) {
              newProviders.push({
                id: row.id,
                cooldownId: `${row.id}-${idx}`,
                openaiBase: buildOpenaiBase(row.baseUrl),
                apiKey: backupKey,
                type: (row.type as Provider["type"]) || "generic",
              });
              idx++;
            }
          }
        }
      }
    }
    _cachedProviders = newProviders;
    const modelRows = await db.select().from(aiProviderModelsTable);
    _providerModels.clear();
    for (const row of modelRows) {
      const models = _providerModels.get(row.providerId) ?? new Map<string, ProviderModelConfig>();
      models.set(row.modelId, {
        modelId: row.modelId,
        displayName: row.displayName,
        brandProvider: row.brandProvider,
        upstreamModelId: row.upstreamModelId,
        enabled: row.enabled,
        basePriceInput: row.basePriceInput ?? null,
        basePriceOutput: row.basePriceOutput ?? null,
      });
      _providerModels.set(row.providerId, models);
    }
    _providerSettingsLoadedAt = Date.now();
  })().finally(() => {
    _providerSettingsRefresh = null;
  });

  await _providerSettingsRefresh;
}

export async function refreshProviderSettingsForProxy(): Promise<void> {
  try {
    await Promise.all([
      refreshProviderSettings(),
      refreshModelPricingOverrides(),
    ]);
  } catch (error) {
    logger.error({ err: error }, "Failed to refresh provider/pricing settings; using cached state");
  }
}

export function getProviders(): Provider[] {
  return _cachedProviders;
}

export function filterProvidersForModel(providers: Provider[], model: string): Provider[] {
  return providers.filter((p) => {
    const configured = _providerModels.get(p.id);
    return configured?.get(model)?.enabled === true;
  });
}

export function upstreamModelFor(provider: Provider, publicModelId: string): string {
  return _providerModels.get(provider.id)?.get(publicModelId)?.upstreamModelId ?? publicModelId;
}

export function orderProvidersForAttempts(providers: Provider[]): Provider[] {
  const now = Date.now();
  return [...providers].sort((a, b) => {
    const aCooling = (_cooldowns.get(a.cooldownId) ?? 0) >= now ? 1 : 0;
    const bCooling = (_cooldowns.get(b.cooldownId) ?? 0) >= now ? 1 : 0;
    return aCooling - bCooling;
  });
}

export function pickProvider(providers: Provider[]): Provider {
  const now = Date.now();
  const best = providers.find(
    (p) => !_disabledProviders.has(p.id) && (_cooldowns.get(p.cooldownId) ?? 0) < now
  );
  if (best) return best;
  const enabledAny = providers.find((p) => !_disabledProviders.has(p.id));
  if (enabledAny) {
    logger.warn({ id: enabledAny.cooldownId }, "Provider in cooldown but no other enabled provider");
    return enabledAny;
  }
  logger.warn("All providers disabled, using first as fallback");
  return providers[0];
}

export function pickNextProvider(providers: Provider[], exclude: Provider): Provider | null {
  const now = Date.now();
  const others = providers.filter((p) => p.cooldownId !== exclude.cooldownId && !_disabledProviders.has(p.id));
  if (others.length === 0) return null;
  return others.find((p) => (_cooldowns.get(p.cooldownId) ?? 0) < now) ?? others[0];
}

export function markCooldown(provider: Provider): void {
  _cooldowns.set(provider.cooldownId, Date.now() + PROVIDER_COOLDOWN_MS);
  logger.warn({ provider: provider.cooldownId, cooldownSec: PROVIDER_COOLDOWN_MS / 1000 }, "Provider put in cooldown");
}

export function getModelBasePricing(modelId: string): { input: number; output: number } {
  const catalog = getCatalogModelPricing(modelId);
  for (const [providerId, models] of _providerModels.entries()) {
    if (_disabledProviders.has(providerId)) continue;
    const model = models.get(modelId);
    if (model && model.enabled && (model.basePriceInput != null || model.basePriceOutput != null)) {
      return {
        input: model.basePriceInput != null ? model.basePriceInput : catalog.input,
        output: model.basePriceOutput != null ? model.basePriceOutput : catalog.output,
      };
    }
  }
  for (const [, models] of _providerModels.entries()) {
    const model = models.get(modelId);
    if (model && (model.basePriceInput != null || model.basePriceOutput != null)) {
      return {
        input: model.basePriceInput != null ? model.basePriceInput : catalog.input,
        output: model.basePriceOutput != null ? model.basePriceOutput : catalog.output,
      };
    }
  }
  return catalog;
}

export function adminGetActiveProviderIds(): string[] {
  try {
    return getProviders().map((p) => p.id);
  } catch {
    return [];
  }
}

export async function getConfiguredPublicModelCatalog() {
  await refreshProviderSettingsForProxy();
  const activeProviderIds = new Set(adminGetActiveProviderIds());
  const configured = new Map<string, { displayName: string; brands: Set<string> }>();
  for (const [providerId, models] of _providerModels) {
    if (_disabledProviders.has(providerId)) continue;
    if (!activeProviderIds.has(providerId)) continue;

    for (const model of models.values()) {
      if (!model.enabled) continue;
      const entry = configured.get(model.modelId) ?? { displayName: model.displayName, brands: new Set<string>() };
      entry.brands.add(model.brandProvider);
      configured.set(model.modelId, entry);
    }
  }

  return Array.from(configured.entries()).map(([modelId, entry]) => {
    const cleanModelId = modelId.includes('/') ? modelId.split('/').pop()! : modelId;
    const catalog = MODEL_CATALOG.find((model) => model.id === modelId || model.aliases?.includes(modelId) || model.id === cleanModelId || model.aliases?.includes(cleanModelId));
    const basePricing = getModelBasePricing(modelId);
    const override = _modelPricingOverrides.get(modelId);
    let pricing = basePricing;
    if (override?.mode === "free") pricing = { input: 0, output: 0 };
    else if (override?.mode === "discount_percent" && override.discountPercent != null) {
      const factor = 1 - Math.min(100, Math.max(0, override.discountPercent)) / 100;
      pricing = { input: basePricing.input * factor, output: basePricing.output * factor };
    } else if (override?.mode === "fixed_price") {
      pricing = {
        input: override.inputPriceOverride != null ? Number.parseFloat(override.inputPriceOverride) : basePricing.input,
        output: override.outputPriceOverride != null ? Number.parseFloat(override.outputPriceOverride) : basePricing.output,
      };
    }
    return {
      id: modelId,
      label: catalog?.label ?? entry.displayName,
      provider: catalog?.provider ?? Array.from(entry.brands).sort().join(", "),
      providerIds: Array.from(entry.brands).sort(),
      pricing,
      basePricing,
      pricingMode: override?.mode ?? "default",
      context: catalog?.context ?? "-",
      note: catalog?.note ?? null,
      description: catalog?.description ?? `Model ${entry.displayName} tersedia melalui Mution AI Gateway.`,
      aliases: catalog?.aliases ?? [],
    };
  }).sort((a, b) => {
    const cleanA = a.id.includes('/') ? a.id.split('/').pop()! : a.id;
    const cleanB = b.id.includes('/') ? b.id.split('/').pop()! : b.id;
    const indexA = MODEL_CATALOG.findIndex((m) => m.id === a.id || m.aliases?.includes(a.id) || m.id === cleanA || m.aliases?.includes(cleanA));
    const indexB = MODEL_CATALOG.findIndex((m) => m.id === b.id || m.aliases?.includes(b.id) || m.id === cleanB || m.aliases?.includes(cleanB));
    const orderA = indexA === -1 ? 9999 : indexA;
    const orderB = indexB === -1 ? 9999 : indexB;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label);
  });
}

export async function setProviderEnabled(id: string, enabled: boolean): Promise<void> {
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
  const providers = getProviders();
  const rows = await db.select().from(aiProviderSettingsTable).orderBy(asc(aiProviderSettingsTable.priority));
  const now = Date.now();
  return rows.map((row) => {
    const inCooldown = (_cooldowns.get(`${row.id}-0`) ?? 0) > now;
    const cooldownExpiresAt = inCooldown
      ? new Date(_cooldowns.get(`${row.id}-0`)!).toISOString()
      : null;
    const backupKeysCount = Array.isArray(row.backupApiKeysEncrypted) ? row.backupApiKeysEncrypted.length : 0;
    const totalKeys = 1 + backupKeysCount;

    return {
      id: row.id,
      name: row.name || row.id,
      openaiBase: buildOpenaiBase(row.baseUrl),
      type: row.type,
      priority: row.priority ?? 0,
      enabled: !_disabledProviders.has(row.id),
      inCooldown,
      cooldownExpiresAt,
      totalKeys,
      models: Array.from(_providerModels.get(row.id)?.values() ?? []),
    };
  });
}

export async function adminCreateProvider(data: { id: string; name: string; baseUrl: string; apiKey: string; backupApiKeys?: string[]; type?: string; priority?: number }) {
  const now = new Date();
  let backupApiKeysEncrypted: string[] = [];
  if (data.backupApiKeys && Array.isArray(data.backupApiKeys)) {
    backupApiKeysEncrypted = data.backupApiKeys.map(k => encryptSecret(k.trim())).filter(k => k);
  }

  await db.insert(aiProviderSettingsTable).values({
    id: data.id,
    name: data.name,
    baseUrl: data.baseUrl,
    apiKeyEncrypted: encryptSecret(data.apiKey),
    backupApiKeysEncrypted: backupApiKeysEncrypted.length > 0 ? backupApiKeysEncrypted : null,
    type: data.type || "generic",
    priority: data.priority ?? 0,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });
  await refreshProviderSettings(true);
}

export async function adminUpdateProvider(id: string, data: { name?: string; baseUrl?: string; apiKey?: string; backupApiKeys?: string[]; type?: string; priority?: number }) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updates.name = data.name;
  if (data.baseUrl !== undefined) updates.baseUrl = data.baseUrl;
  if (data.apiKey !== undefined && data.apiKey.trim()) updates.apiKeyEncrypted = encryptSecret(data.apiKey);
  
  if (data.backupApiKeys !== undefined) {
    if (Array.isArray(data.backupApiKeys) && data.backupApiKeys.length > 0) {
      updates.backupApiKeysEncrypted = data.backupApiKeys.map(k => encryptSecret(k.trim())).filter(k => k);
    } else {
      updates.backupApiKeysEncrypted = null;
    }
  }

  if (data.type !== undefined) updates.type = data.type;
  if (data.priority !== undefined) updates.priority = data.priority;
  await db.update(aiProviderSettingsTable).set(updates).where(eq(aiProviderSettingsTable.id, id));
  await refreshProviderSettings(true);
}

export async function adminFetchRemoteModels(id: string) {
  const row = await db.query.aiProviderSettingsTable.findFirst({ where: eq(aiProviderSettingsTable.id, id) });
  if (!row) throw new Error("Provider not found");
  if (!row.baseUrl || !row.apiKeyEncrypted) throw new Error("Provider incomplete (missing URL or API Key)");
  const apiKey = decryptSecret(row.apiKeyEncrypted);
  if (!apiKey) throw new Error("Failed to decrypt API key");
  
  let fetchUrl = row.baseUrl.replace(/\/$/, "");
  if (!fetchUrl.endsWith('/v1') && !fetchUrl.match(/\/v\d/)) {
    fetchUrl += '/v1';
  }
  fetchUrl += "/models";

  const res = await fetch(fetchUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Provider returned ${res.status}: ${errText.slice(0, 100)}`);
  }
  const json = (await res.json()) as any;
  const modelsList = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
  return modelsList.map((m: any) => ({
    id: m.id,
    created: m.created
  }));
}

export async function adminTestProviderModel(providerId: string, modelId: string) {
  const provider = await db.query.aiProviderSettingsTable.findFirst({ where: eq(aiProviderSettingsTable.id, providerId) });
  if (!provider) throw new Error("Provider not found");
  if (!provider.baseUrl || !provider.apiKeyEncrypted) throw new Error("Provider incomplete (missing URL or API Key)");
  
  const model = await db.query.aiProviderModelsTable.findFirst({
    where: and(eq(aiProviderModelsTable.providerId, providerId), eq(aiProviderModelsTable.modelId, modelId))
  });
  if (!model) throw new Error("Model not found on this provider");

  const apiKey = decryptSecret(provider.apiKeyEncrypted);
  if (!apiKey) throw new Error("Failed to decrypt API key");

  const isConduit = provider.type === "conduit";

  let fetchUrl = provider.baseUrl.replace(/\/$/, "");
  if (!fetchUrl.endsWith('/v1') && !fetchUrl.match(/\/v\d/)) {
    fetchUrl += '/v1';
  }
  fetchUrl += isConduit ? "/messages" : "/chat/completions";

  let res: globalThis.Response;
  try {
    res = await fetch(fetchUrl, {
      method: "POST",
      headers: isConduit
        ? {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          }
        : {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
      body: JSON.stringify({
        model: model.upstreamModelId,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 64
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (fetchErr: any) {
    if (fetchErr.name === "TimeoutError") {
      return { ok: false, error: "Timeout (30s): Server upstream tidak merespons tepat waktu. Upstream mungkin sedang lambat atau kelebihan beban." };
    }
    return { ok: false, error: `Network error: ${fetchErr.message}` };
  }
  
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    try {
      const errJson = JSON.parse(text);
      return { ok: false, error: errJson.error?.message || errJson.message || `HTTP ${res.status}: ${text.slice(0, 150)}` };
    } catch {
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        return { ok: false, error: `Upstream error (HTTP ${res.status}): Server upstream mengembalikan halaman HTML/error, bukan JSON.` };
      }
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 150)}` };
    }
  }

  try {
    const data = JSON.parse(text);
    if (data.error) {
      const errMsg = typeof data.error === "string" ? data.error : data.error?.message || JSON.stringify(data.error);
      return { ok: false, error: errMsg };
    }
    return { ok: true, data };
  } catch {
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      return { ok: false, error: "Upstream mengembalikan halaman HTML web/challenge, bukan respons JSON AI." };
    }
    return { ok: false, error: `Respon upstream tidak valid: ${text.slice(0, 150)}` };
  }
}

export async function adminTestRawModel(providerId: string, upstreamModelId: string, retryCount = 0): Promise<{ ok: boolean; error?: string; data?: any }> {
  const MAX_RETRIES = 2;
  const provider = await db.query.aiProviderSettingsTable.findFirst({ where: eq(aiProviderSettingsTable.id, providerId) });
  if (!provider) throw new Error("Provider not found");
  if (!provider.baseUrl || !provider.apiKeyEncrypted) throw new Error("Provider incomplete (missing URL or API Key)");
  
  const apiKey = decryptSecret(provider.apiKeyEncrypted);
  if (!apiKey) throw new Error("Failed to decrypt API key");

  const isConduit = provider.type === "conduit";

  let fetchUrl = provider.baseUrl.replace(/\/$/, "");
  if (!fetchUrl.endsWith('/v1') && !fetchUrl.match(/\/v\d/)) {
    fetchUrl += '/v1';
  }
  fetchUrl += isConduit ? "/messages" : "/chat/completions";

  let res: globalThis.Response;
  try {
    res = await fetch(fetchUrl, {
      method: "POST",
      headers: isConduit
        ? {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          }
        : {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
      body: JSON.stringify({
        model: upstreamModelId,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 32
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (fetchErr: any) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 3000 * (retryCount + 1)));
      return adminTestRawModel(providerId, upstreamModelId, retryCount + 1);
    }
    return { ok: false, error: `Network error: ${fetchErr.message}` };
  }
  
  if ((res.status === 429 || res.status >= 500) && retryCount < MAX_RETRIES) {
    const waitMs = res.status === 429 ? 5000 * (retryCount + 1) : 3000 * (retryCount + 1);
    await new Promise(r => setTimeout(r, waitMs));
    return adminTestRawModel(providerId, upstreamModelId, retryCount + 1);
  }
  
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    try {
      const errJson = JSON.parse(errText);
      return { ok: false, error: errJson.error?.message || errJson.message || `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    } catch (e) {
      return { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
  }
  
  const text = await res.text().catch(() => "");
  try {
    const data = JSON.parse(text);
    if (data.error) {
      const errMsg = typeof data.error === "string" ? data.error : data.error?.message || JSON.stringify(data.error);
      if (retryCount < MAX_RETRIES && /rate.?limit|concurren|too many|quota|limit|throttl/i.test(errMsg)) {
        await new Promise(r => setTimeout(r, 5000 * (retryCount + 1)));
        return adminTestRawModel(providerId, upstreamModelId, retryCount + 1);
      }
      return { ok: false, error: errMsg };
    }
    if (data.choices || data.id || data.object) {
      return { ok: true, data };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: `Invalid JSON response: ${text.slice(0, 200)}` };
  }
}

export async function adminDeleteProvider(id: string) {
  await db.delete(aiProviderModelsTable).where(eq(aiProviderModelsTable.providerId, id));
  await db.delete(aiProviderSettingsTable).where(eq(aiProviderSettingsTable.id, id));
  await refreshProviderSettings(true);
}

export async function adminUpsertProviderModel(
  providerId: string,
  modelId: string,
  payload: {
    displayName: string;
    brandProvider: string;
    upstreamModelId: string;
    enabled: boolean;
    basePriceInput?: number | null;
    basePriceOutput?: number | null;
  },
  oldModelId?: string
) {
  const now = new Date();
  if (oldModelId && oldModelId !== modelId) await db.delete(aiProviderModelsTable).where(and(eq(aiProviderModelsTable.providerId, providerId), eq(aiProviderModelsTable.modelId, oldModelId)));
  await db.insert(aiProviderModelsTable).values({ providerId, modelId, ...payload, updatedAt: now }).onConflictDoUpdate({
    target: [aiProviderModelsTable.providerId, aiProviderModelsTable.modelId],
    set: { ...payload, updatedAt: now },
  });
  await refreshProviderSettings(true);
}

export async function adminDeleteProviderModel(providerId: string, modelId: string) {
  await db.delete(aiProviderModelsTable).where(and(eq(aiProviderModelsTable.providerId, providerId), eq(aiProviderModelsTable.modelId, modelId)));
  await refreshProviderSettings(true);
}

export async function adminPruneProviderModels(providerId: string, keepModelIds: string[]) {
  if (keepModelIds.length > 0) {
    await db.delete(aiProviderModelsTable).where(
      and(
        eq(aiProviderModelsTable.providerId, providerId),
        notInArray(aiProviderModelsTable.modelId, keepModelIds)
      )
    );
  } else {
    await db.delete(aiProviderModelsTable).where(eq(aiProviderModelsTable.providerId, providerId));
  }
  await refreshProviderSettings(true);
}

export async function adminGetModelPricingOverrides() {
  await refreshModelPricingOverrides(true);
  const rows = await db.select().from(modelPricingOverridesTable);
  return rows;
}

export async function adminSetModelPricingOverride(
  modelId: string,
  payload: {
    mode: "default" | "discount_percent" | "fixed_price" | "free";
    discountPercent?: number | null;
    inputPriceOverride?: string | null;
    outputPriceOverride?: string | null;
  },
  updatedBy?: number,
) {
  const now = new Date();
  await db
    .insert(modelPricingOverridesTable)
    .values({
      modelId,
      mode: payload.mode,
      discountPercent: payload.discountPercent ?? null,
      inputPriceOverride: payload.inputPriceOverride ?? null,
      outputPriceOverride: payload.outputPriceOverride ?? null,
      updatedAt: now,
      updatedBy: updatedBy ?? null,
    })
    .onConflictDoUpdate({
      target: modelPricingOverridesTable.modelId,
      set: {
        mode: payload.mode,
        discountPercent: payload.discountPercent ?? null,
        inputPriceOverride: payload.inputPriceOverride ?? null,
        outputPriceOverride: payload.outputPriceOverride ?? null,
        updatedAt: now,
        updatedBy: updatedBy ?? null,
      },
    });

  if (payload.mode === "default") {
    _modelPricingOverrides.delete(modelId);
  } else {
    _modelPricingOverrides.set(modelId, {
      mode: payload.mode,
      discountPercent: payload.discountPercent ?? null,
      inputPriceOverride: payload.inputPriceOverride ?? null,
      outputPriceOverride: payload.outputPriceOverride ?? null,
    });
  }
}

export async function adminDeleteModelPricingOverride(modelId: string) {
  await db.delete(modelPricingOverridesTable).where(eq(modelPricingOverridesTable.modelId, modelId));
  _modelPricingOverrides.delete(modelId);
}

export async function getUpstreamHealth() {
  await refreshProviderSettingsForProxy();
  let providers: Provider[];
  try { providers = getProviders(); } catch { return { status: "Offline" as const, latencyMs: 0, lastChecked: 0 }; }

  const active = providers.filter((p) => !_disabledProviders.has(p.id));
  if (active.length === 0) return { status: "Offline" as const, latencyMs: 0, lastChecked: 0 };

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

  if (onlineCount === 0) return { status: "Offline" as const, latencyMs: 0, lastChecked: newestCheck || Date.now() };

  const avgLatency = Math.round(totalLatency / onlineCount);
  const status = onlineCount < active.length ? ("Degraded" as const) : ("Online" as const);
  return { status, latencyMs: avgLatency, lastChecked: newestCheck };
}

export function startUpstreamHealthCheck() {
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
          signal: AbortSignal.timeout(10000),
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

  runCheck();
  setInterval(runCheck, 3 * 60 * 1000);
}

export async function seedProvidersFromEnv(): Promise<void> {
  const existing = await db.select({ id: aiProviderSettingsTable.id }).from(aiProviderSettingsTable)
    .where(ne(aiProviderSettingsTable.baseUrl, ""));
  if (existing.length > 0) {
    logger.info({ count: existing.length }, "Providers already exist in DB, skipping env seed");
    return;
  }

  const skipPrefixes = ["SESSION", "DATABASE", "SUPABASE", "AGENTROUTER", "TRIPAY", "DUITKU", "GITHUB"];
  let seeded = 0;
  const now = new Date();

  for (const [envKey, envVal] of Object.entries(process.env)) {
    if (!envKey.endsWith("_API_KEY") || !envVal?.trim()) continue;
    const prefix = envKey.slice(0, -"_API_KEY".length);
    if (skipPrefixes.some((s) => prefix.includes(s))) continue;

    const rawUrl = (process.env[`${prefix}_BASE_URL`] ?? "").trim();
    if (!rawUrl) continue;

    const id = prefix.toLowerCase();
    try {
      await db.insert(aiProviderSettingsTable).values({
        id,
        name: prefix,
        baseUrl: rawUrl,
        apiKeyEncrypted: encryptSecret(envVal.trim()),
        type: detectType(rawUrl),
        priority: seeded,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: aiProviderSettingsTable.id,
        set: {
          name: prefix,
          baseUrl: rawUrl,
          apiKeyEncrypted: encryptSecret(envVal.trim()),
          type: detectType(rawUrl),
          updatedAt: now,
        },
      });
      seeded++;
      logger.info({ id, baseUrl: rawUrl }, "Seeded provider from env");
    } catch (err) {
      logger.error({ err, id }, "Failed to seed provider from env");
    }
  }

  if (seeded > 0) {
    logger.info({ count: seeded }, "Provider seed from env completed");
    await refreshProviderSettings(true);
  } else {
    logger.warn("No providers found in env to seed");
  }
}
