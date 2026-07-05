import { Router } from "express";
import { db, usersTable, apiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import crypto from "crypto";

const router = Router();

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

router.get("/api-keys", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const keys = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, user.id));
  res.json(keys.map(serializeKey));
});

router.post("/api-keys", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { name, expiresAt, creditLimit, allowedModels } = req.body;

  const existing = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, user.id), eq(apiKeysTable.isActive, true)));

  if (existing.length >= 10) {
    res.status(400).json({ error: "Maksimal 10 API key aktif per akun" });
    return;
  }

  const { fullKey, prefix, hash } = generateApiKey();

  const [created] = await db
    .insert(apiKeysTable)
    .values({
      userId: user.id,
      name: name?.trim() || "My API Key",
      keyPrefix: prefix,
      keyHash: hash,
      keyPlain: fullKey,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      creditLimit: creditLimit === null ? null : typeof creditLimit === "number" ? creditLimit : null,
      allowedModels: allowedModels === null ? null : (Array.isArray(allowedModels) && allowedModels.length > 0 ? allowedModels : null),
    })
    .returning();

  res.status(201).json({
    ...serializeKey(created),
    fullKey,
  });
});

router.get("/api-keys/:id/reveal", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = Number(req.params.id);

  const [key] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, user.id)));

  if (!key) {
    res.status(404).json({ error: "API key tidak ditemukan" });
    return;
  }
  if (!key.keyPlain) {
    res.status(410).json({ error: "Key ini dibuat sebelum fitur reveal tersedia. Hapus dan buat key baru." });
    return;
  }

  res.json({ fullKey: key.keyPlain });
});

router.patch("/api-keys/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const { name, expiresAt, creditLimit, allowedModels } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: "Nama tidak boleh kosong" });
    return;
  }

  const [updated] = await db
    .update(apiKeysTable)
    .set({ 
      name: name.trim(),
      expiresAt: expiresAt === null ? null : expiresAt ? new Date(expiresAt) : undefined,
      creditLimit: creditLimit === null ? null : typeof creditLimit === "number" ? creditLimit : undefined,
      allowedModels: allowedModels === null ? null : (Array.isArray(allowedModels) && allowedModels.length > 0 ? allowedModels : undefined),
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

  const [revoked] = await db
    .update(apiKeysTable)
    .set({ isActive: false })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, user.id)))
    .returning();

  if (!revoked) {
    res.status(404).json({ error: "API key tidak ditemukan" });
    return;
  }

  res.json({ success: true });
});

export default router;
