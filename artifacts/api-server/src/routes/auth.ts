import { Router } from "express";
import { db, usersTable, referralsTable, creditTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createSession, deleteOtherUserSessions, deleteSession, requireAuth, SESSION_COOKIE, SESSION_DURATION_MS } from "../lib/auth";
import { computePlan } from "../lib/plan";
import { authRateLimitKey, issueCsrfToken, rateLimit } from "../lib/security";
import { logger } from "../lib/logger";
import { REFEREE_BONUS } from "./referral";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex");
}

const router = Router();

const AuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "auth",
  key: authRateLimitKey,
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
});

const LoginBody = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

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

router.post("/auth/register", AuthLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nama, email, atau password tidak valid" });
    return;
  }

  const { email, password, name } = parsed.data;
  // Accept ref from query string OR request body (for clients that can't set query params)
  const rawRef = req.query.ref ?? req.body.refCode ?? null;
  const refCode = typeof rawRef === "string" && rawRef.trim() ? rawRef.trim() : null;

  logger.info({ email, refCode, bodyKeys: Object.keys(req.body) }, "Register attempt");

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  // Resolve referrer before creating user
  let referrer: typeof usersTable.$inferSelect | null = null;
  if (refCode) {
    const [found] = await db.select().from(usersTable).where(eq(usersTable.referralCode, refCode));
    logger.info({ refCode, referrerFound: !!found, referrerId: found?.id }, "Referral lookup");
    if (found) referrer = found;
  }

  const referralCode = generateReferralCode();
  const passwordHash = await bcrypt.hash(password, 12);

  // Give welcome bonus if referred; default credits = 5000, add REFEREE_BONUS on top
  const initialCredits = referrer ? 5000 + REFEREE_BONUS : 5000;
  logger.info({ referrer: referrer?.email ?? null, initialCredits }, "Creating user");

  const [user] = await db
    .insert(usersTable)
    .values({ email, name, passwordHash, role: "user", plan: "hobby", credits: initialCredits, referralCode, lastLoginAt: new Date() })
    .returning();

  // Record referral & welcome bonus transaction
  if (referrer && referrer.id !== user.id) {
    await db.insert(referralsTable).values({ referrerId: referrer.id, refereeId: user.id });
    await db.insert(creditTransactionsTable).values({
      userId: user.id,
      type: "topup",
      amount: REFEREE_BONUS,
      note: `Bonus welcome dari program referral (kode: ${refCode})`,
    });
    logger.info({ referrerId: referrer.id, refereeId: user.id, bonus: REFEREE_BONUS }, "Referral recorded + welcome bonus given");
  }

  const sessionId = await createSession(user.id);
  setSessionCookie(res, sessionId);

  res.status(201).json({ user: serializeUser(user) });
});

// Public endpoint to validate a referral code and return referrer's first name
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
