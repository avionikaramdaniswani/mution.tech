import { Router } from "express";
import { cleanupInactiveApiKeys, db, deleteApiKeyForUser, apiKeysTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import crypto from "crypto";
import { z } from "zod";
import { AVAILABLE_MODEL_IDS } from "@workspace/model-catalog";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "../lib/secret-box";

const router = Router();
const MAX_ACTIVE_KEYS = 10;
const MAX_KEY_CREDIT_LIMIT = 10_000_000;

const AllowedModelsSchema = z
  .array(z.string().trim().min(1).max(128).refine((model) => AVAILABLE_MODEL_IDS.includes(model), "Model tidak valid"))
  .max(25)
  .transform((models) => [...new Set(models)]);

const ApiKeyCreateBody = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  expiresAt: z.union([z.string().trim().max(30), z.null()]).optional(),
  creditLimit: z.union([z.number().int().min(1).max(MAX_KEY_CREDIT_LIMIT), z.null()]).optional(),
  allowedModels: z.union([AllowedModelsSchema, z.null()]).optional(),
});

const ApiKeyUpdateBody = ApiKeyCreateBody.extend({
  name: z.string().trim().min(1).max(80),
});

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const fullKey = `mk_live_${raw}`;
  const prefix = `${fullKey.slice(0, 16)}...`;
  const hash = crypto.createHash("sha256").update(fullKey).digest("hex");
  return { fullKey, prefix, hash };
}

function serializeKey(key: typeof apiKeysTable.$inferSelect) {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    isActive: key.isActive,
    totalTokensUsed: key.totalTokensUsed,
    totalRequestsCount: key.totalRequestsCount,
    totalCreditsUsed: key.totalCreditsUsed,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString() ?? null,
    creditLimit: key.creditLimit,
    allowedModels: key.allowedModels,
  };
}

function parseExpiresAt(value: string | null | undefined, fallbackToNull: boolean): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined) return fallbackToNull ? null : undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const date = new Date(`${value}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime()) || date <= new Date()) return undefined;
  return date;
}

router.get("/api-keys", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await cleanupInactiveApiKeys({ userId: user.id });

  const keys = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, user.id));
  res.json(keys.map(serializeKey));
});

router.post("/api-keys", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = ApiKeyCreateBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Konfigurasi API key tidak valid" });
    return;
  }

  const expiresAt = parseExpiresAt(parsed.data.expiresAt, true);
  if (expiresAt === undefined) {
    res.status(400).json({ error: "Tanggal kedaluwarsa tidak valid" });
    return;
  }

  const name = parsed.data.name ?? "My API Key";
  const creditLimit = parsed.data.creditLimit ?? null;
  const allowedModels = parsed.data.allowedModels ?? null;
  const { fullKey, prefix, hash } = generateApiKey();

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${user.id})`);

    const existing = await tx
      .select({ id: apiKeysTable.id })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.userId, user.id), eq(apiKeysTable.isActive, true)));

    if (existing.length >= MAX_ACTIVE_KEYS) return null;

    const [row] = await tx
      .insert(apiKeysTable)
      .values({
        userId: user.id,
        name,
        keyPrefix: prefix,
        keyHash: hash,
        keyPlain: encryptSecret(fullKey),
        expiresAt,
        creditLimit,
        allowedModels: allowedModels && allowedModels.length > 0 ? allowedModels : null,
      })
      .returning();
    return row;
  });

  if (!created) {
    res.status(400).json({ error: "Maksimal 10 API key aktif per akun" });
    return;
  }

  res.status(201).json({
    ...serializeKey(created),
    fullKey,
  });
});

router.get("/api-keys/:id/reveal", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID API key tidak valid" });
    return;
  }

  const [key] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, user.id)));

  if (!key) {
    res.status(404).json({ error: "API key tidak ditemukan" });
    return;
  }

  const fullKey = decryptSecret(key.keyPlain);
  const fullKeyHash = fullKey ? crypto.createHash("sha256").update(fullKey).digest("hex") : null;
  if (!fullKey || fullKeyHash !== key.keyHash) {
    res.status(410).json({ error: "Full API key tidak tersedia untuk key ini. Buat key baru jika key lama hilang." });
    return;
  }

  if (!isEncryptedSecret(key.keyPlain)) {
    await db
      .update(apiKeysTable)
      .set({ keyPlain: encryptSecret(fullKey) })
      .where(and(eq(apiKeysTable.id, key.id), eq(apiKeysTable.userId, user.id)));
  }

  res.json({ fullKey });
});

router.patch("/api-keys/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID API key tidak valid" });
    return;
  }

  const parsed = ApiKeyUpdateBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Konfigurasi API key tidak valid" });
    return;
  }

  const expiresAt = parseExpiresAt(parsed.data.expiresAt, false);
  if (expiresAt === undefined && parsed.data.expiresAt !== undefined) {
    res.status(400).json({ error: "Tanggal kedaluwarsa tidak valid" });
    return;
  }

  const [updated] = await db
    .update(apiKeysTable)
    .set({ 
      name: parsed.data.name,
      expiresAt,
      creditLimit: parsed.data.creditLimit,
      allowedModels: parsed.data.allowedModels === null
        ? null
        : parsed.data.allowedModels && parsed.data.allowedModels.length > 0
          ? parsed.data.allowedModels
          : undefined,
    })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "API key tidak ditemukan" });
    return;
  }

  res.json(serializeKey(updated));
});

router.delete("/api-keys/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID API key tidak valid" });
    return;
  }

  const deleted = await deleteApiKeyForUser({ id, userId: user.id });

  if (!deleted) {
    res.status(404).json({ error: "API key tidak ditemukan" });
    return;
  }

  res.json({ success: true });
});

export default router;
