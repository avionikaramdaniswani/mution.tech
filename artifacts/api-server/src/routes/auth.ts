import { Router } from "express";
import { db, usersTable, referralsTable, creditTransactionsTable, otpVerificationsTable } from "@workspace/db";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { createSession, deleteOtherUserSessions, deleteSession, requireAuth, SESSION_COOKIE, SESSION_DURATION_MS } from "../lib/auth";
import { computePlan } from "../lib/plan";
import { authRateLimitKey, issueCsrfToken, rateLimit } from "../lib/security";
import { logger } from "../lib/logger";
import { REFEREE_BONUS } from "./referral";
import { sendOtpEmail } from "../lib/email";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex");
}

function generateOtp(): string {
  // 6-digit numeric OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

const router = Router();

const AuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "auth",
  key: authRateLimitKey,
});

const OtpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: "otp-send",
  key: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    return `${req.ip ?? "unknown"}:${email}`;
  },
});

const PasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: "password-change",
  key: (req) => `${req.ip ?? "unknown"}:${(req as any).user?.id ?? "anonymous"}`,
});

const RegisterBody = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(80),
  otp: z.string().length(6).regex(/^\d{6}$/),
});

const LoginBody = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const OtpSendBody = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
});

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    credits: user.credits,
    createdAt: user.createdAt.toISOString(),
  };
}

function setSessionCookie(res: any, sessionId: string): void {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS,
  });
}

function clearSessionCookie(res: any): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

router.get("/auth/csrf", (req, res): void => {
  res.json({ csrfToken: issueCsrfToken(req, res) });
});

// ─── OTP: Send ────────────────────────────────────────────────────────────────
router.post("/auth/otp/send", OtpSendLimiter, async (req, res): Promise<void> => {
  const parsed = OtpSendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Format email tidak valid" });
    return;
  }

  const { email } = parsed.data;

  // Check if email is already registered
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email sudah terdaftar. Silakan login." });
    return;
  }

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Invalidate any previous unused OTPs for this email
  await db
    .update(otpVerificationsTable)
    .set({ usedAt: new Date() })
    .where(and(eq(otpVerificationsTable.email, email), isNull(otpVerificationsTable.usedAt)));

  await db.insert(otpVerificationsTable).values({ email, codeHash, expiresAt });

  const sent = await sendOtpEmail(email, otp);
  if (!sent) {
    res.status(503).json({ error: "Gagal mengirim email. Coba lagi beberapa saat." });
    return;
  }

  logger.info({ email }, "OTP sent for registration");
  res.json({ success: true });
});

// ─── Register (with OTP verification) ────────────────────────────────────────
router.post("/auth/register", AuthLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid. Pastikan semua kolom terisi dengan benar." });
    return;
  }

  const { email, password, name, otp } = parsed.data;
  const rawRef = req.query.ref ?? req.body.refCode ?? null;
  const refCode = typeof rawRef === "string" && rawRef.trim() ? rawRef.trim() : null;

  // Verify OTP
  const codeHash = hashOtp(otp);
  const now = new Date();
  const [otpRecord] = await db
    .select()
    .from(otpVerificationsTable)
    .where(
      and(
        eq(otpVerificationsTable.email, email),
        eq(otpVerificationsTable.codeHash, codeHash),
        isNull(otpVerificationsTable.usedAt),
        gt(otpVerificationsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!otpRecord) {
    res.status(400).json({ error: "Kode OTP tidak valid atau sudah kedaluwarsa." });
    return;
  }

  logger.info({ email, refCode }, "Register attempt");

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email sudah terdaftar." });
    return;
  }

  // Resolve referrer
  let referrer: typeof usersTable.$inferSelect | null = null;
  if (refCode) {
    const [found] = await db.select().from(usersTable).where(eq(usersTable.referralCode, refCode));
    if (found) referrer = found;
  }

  const referralCode = generateReferralCode();
  const passwordHash = await bcrypt.hash(password, 12);
  const initialCredits = referrer ? 5000 + REFEREE_BONUS : 5000;

  const [user] = await db
    .insert(usersTable)
    .values({ email, name, passwordHash, role: "user", plan: "hobby", credits: initialCredits, referralCode, lastLoginAt: new Date() })
    .returning();

  // Mark OTP as used
  await db
    .update(otpVerificationsTable)
    .set({ usedAt: new Date() })
    .where(eq(otpVerificationsTable.id, otpRecord.id));

  // Record referral
  if (referrer && referrer.id !== user.id) {
    await db.insert(referralsTable).values({ referrerId: referrer.id, refereeId: user.id });
    await db.insert(creditTransactionsTable).values({
      userId: user.id,
      type: "topup",
      amount: REFEREE_BONUS,
      note: `Bonus welcome dari program referral (kode: ${refCode})`,
    });
    logger.info({ referrerId: referrer.id, refereeId: user.id }, "Referral recorded");
  }

  const sessionId = await createSession(user.id);
  setSessionCookie(res, sessionId);

  res.status(201).json({ user: serializeUser(user) });
});

// Public endpoint to validate a referral code
router.get("/auth/check-ref", async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code.trim() : null;
  if (!code) { res.json({ valid: false }); return; }
  const [found] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.referralCode, code));
  if (!found) { res.json({ valid: false }); return; }
  res.json({ valid: true, referrerName: found.name.split(" ")[0] });
});

router.post("/auth/login", AuthLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email atau password tidak valid" });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const newPlan = computePlan(user.credits);
  const [updated] = await db
    .update(usersTable)
    .set({ lastLoginAt: new Date(), plan: newPlan })
    .where(eq(usersTable.id, user.id))
    .returning();

  const sessionId = await createSession(user.id);
  setSessionCookie(res, sessionId);

  res.json({ user: serializeUser(updated) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    await deleteSession(sessionId);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

router.post("/auth/password", requireAuth, PasswordLimiter, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Password baru minimal 8 karakter" });
    return;
  }

  const user = (req as any).user as typeof usersTable.$inferSelect;
  const currentSessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const { currentPassword, newPassword } = parsed.data;

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Password saat ini salah" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, user.id));

  if (currentSessionId) {
    await deleteOtherUserSessions(user.id, currentSessionId);
  }

  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json(serializeUser(user));
});

export default router;
