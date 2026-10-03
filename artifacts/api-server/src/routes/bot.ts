import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();
const BOT_SECRET = process.env.BOT_INTERNAL_SECRET || "";

// In-memory store for temporary link tokens (expires after 15 minutes)
const pendingTokens = new Map<string, { userId: number; expiresAt: number }>();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pendingTokens) {
    if (data.expiresAt < now) pendingTokens.delete(token);
  }
}, 5 * 60 * 1000);

// Middleware untuk memblokir akses selain dari bot Telegram
const requireBotSecret = (req: any, res: any, next: any): void => {
  if (!BOT_SECRET) {
    res.status(503).json({ error: "BOT_INTERNAL_SECRET is not configured" });
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${BOT_SECRET}`) {
    res.status(401).json({ error: "Akses Ditolak: Bukan Bot Resmi" });
    return;
  }
  next();
};

// 1. API untuk Dashboard (Web Mution) -> Generate Link Ajaib
router.get("/telegram/generate-link", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user as typeof usersTable.$inferSelect;

  // Buat token acak yang berlaku selama 15 menit
  const token = crypto.randomBytes(32).toString("hex");
  pendingTokens.set(token, { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "MutionBot";

  res.json({
    link: `https://t.me/${botUsername}?start=${token}`,
    token,
  });
});

// 2. API untuk Bot Telegram -> Konfirmasi Link Akun
router.post("/internal/bot/link-account", requireBotSecret, async (req, res): Promise<void> => {
  const { token, telegramId } = req.body;

  if (!token || !telegramId) {
    res.status(400).json({ error: "Token dan telegramId wajib diisi" });
    return;
  }

  const pending = pendingTokens.get(token);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingTokens.delete(token);
    res.status(400).json({ error: "Token kadaluarsa atau tidak valid" });
    return;
  }

  // Hapus token agar tidak bisa dipakai ulang
  pendingTokens.delete(token);

  const userId = pending.userId;

  // Simpan telegramId ke database Mution
  await db.update(usersTable)
    .set({ telegramId: String(telegramId) } as any)
    .where(eq(usersTable.id, userId));

  // Ambil data user untuk menyapa
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.json({
    success: true,
    message: "Akun berhasil dihubungkan",
    name: user?.name,
    email: user?.email,
  });
});

// 3. API untuk Bot Telegram -> Cek Saldo & Info User
router.get("/internal/bot/user", requireBotSecret, async (req, res): Promise<void> => {
  const { telegramId } = req.query;

  if (!telegramId) {
    res.status(400).json({ error: "telegramId wajib diisi" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq((usersTable as any).telegramId, String(telegramId)));

  if (!user) {
    res.status(404).json({ error: "Akun Mution belum terhubung. Silakan klik tombol 'Hubungkan Telegram' di Dashboard web Mution." });
    return;
  }

  res.json({
    name: user.name,
    email: user.email,
    credits: user.credits,
    role: user.role,
  });
});

export default router;
