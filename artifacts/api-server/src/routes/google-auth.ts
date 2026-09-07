import { Router } from "express";
import { db, usersTable, referralsTable, creditTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_REF_COOKIE = "google_oauth_ref";
const GOOGLE_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const REFEREE_BONUS = 5000;

function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not set");
  return id;
}

function getGoogleClientSecret(): string {
  const s = process.env.GOOGLE_CLIENT_SECRET;
  if (!s) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return s;
}

function getGoogleCallbackUrl(): string {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  const appUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl) return `${appUrl.replace(/\/+$/, "")}/api/auth/google/callback`;
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) return `https://${domain}/api/auth/google/callback`;
  // Fallback for local dev
  const port = process.env.PORT || "3001";
  return `http://localhost:${port}/api/auth/google/callback`;
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

function setSessionCookie(res: any, sessionId: string): void {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS,
  });
}

// ─── Step 1: Redirect to Google ─────────────────────────────────────────────

router.get("/auth/google", (req, res): void => {
  try {
    const state = crypto.randomBytes(32).toString("base64url");

    res.cookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: GOOGLE_STATE_MAX_AGE_MS,
    });

    // Preserve referral code if present
    const refCode = typeof req.query.ref === "string" ? req.query.ref.trim() : "";
    if (refCode) {
      res.cookie(GOOGLE_REF_COOKIE, refCode, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: GOOGLE_STATE_MAX_AGE_MS,
      });
    }

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", getGoogleClientId());
    url.searchParams.set("redirect_uri", getGoogleCallbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("access_type", "online");

    res.redirect(url.toString());
  } catch (err: any) {
    logger.error({ err }, "Failed to initiate Google OAuth");
    res.redirect("/login?error=google_failed");
  }
});

// ─── Step 2: Handle callback from Google ────────────────────────────────────

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const { code, state, error: googleError } = req.query as Record<string, string | undefined>;
  const expectedState = req.cookies?.[GOOGLE_STATE_COOKIE];
  const refCode = req.cookies?.[GOOGLE_REF_COOKIE] || null;

  // Clean up OAuth cookies
  const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const };
  res.clearCookie(GOOGLE_STATE_COOKIE, cookieOpts);
  res.clearCookie(GOOGLE_REF_COOKIE, cookieOpts);

  // User denied access or Google returned an error
  if (googleError) {
    logger.warn({ googleError }, "Google OAuth denied or errored");
    res.redirect("/login?error=google_denied");
    return;
  }

  // Validate state
  if (!code || !state || typeof expectedState !== "string" || state !== expectedState) {
    logger.warn("Google OAuth state mismatch or missing code");
    res.redirect("/login?error=google_failed");
    return;
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: getGoogleClientId(),
        client_secret: getGoogleClientSecret(),
        redirect_uri: getGoogleCallbackUrl(),
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as Record<string, any>;

    if (!tokenData.access_token) {
      logger.error({ tokenData }, "Google token exchange failed");
      res.redirect("/login?error=google_failed");
      return;
    }

    // Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      logger.error({ status: userInfoRes.status }, "Google userinfo fetch failed");
      res.redirect("/login?error=google_failed");
      return;
    }

    const googleUser = (await userInfoRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!googleUser.email) {
      logger.error("Google user has no email");
      res.redirect("/login?error=google_failed");
      return;
    }

    const googleId = googleUser.id;
    const email = googleUser.email.toLowerCase().trim();
    const name = googleUser.name || email.split("@")[0];

    // ── Try to find existing user ──

    // 1. Check by googleId first (returning Google user)
    let [user] = await db.select().from(usersTable).where(eq(usersTable.googleId, googleId));

    if (user) {
      // Existing Google user — just login
      const [updated] = await db
        .update(usersTable)
        .set({ lastLoginAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();

      const sessionId = await createSession(updated.id);
      setSessionCookie(res, sessionId);
      logger.info({ userId: updated.id, email }, "Google login (existing)");
      res.redirect(updated.role === "admin" ? "/admin" : "/dashboard");
      return;
    }

    // 2. Check by email (user registered via email, now linking Google)
    [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (user) {
      // Link Google to existing email account
      const [updated] = await db
        .update(usersTable)
        .set({ googleId, lastLoginAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();

      const sessionId = await createSession(updated.id);
      setSessionCookie(res, sessionId);
      logger.info({ userId: updated.id, email }, "Google login (linked to existing email account)");
      res.redirect(updated.role === "admin" ? "/admin" : "/dashboard");
      return;
    }

    // 3. New user — register via Google
    const referralCode = generateReferralCode();

    // Check referrer
    let referrer: typeof usersTable.$inferSelect | null = null;
    if (refCode) {
      const [found] = await db.select().from(usersTable).where(eq(usersTable.referralCode, refCode));
      if (found) referrer = found;
    }

    const initialCredits = referrer ? 5000 + REFEREE_BONUS : 5000;

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email,
        name,
        passwordHash: null,
        googleId,
        role: "user",
        plan: "hobby",
        credits: initialCredits,
        referralCode,
        lastLoginAt: new Date(),
      })
      .returning();

    // Record referral if applicable
    if (referrer && referrer.id !== newUser.id) {
      await db.insert(referralsTable).values({ referrerId: referrer.id, refereeId: newUser.id });
      await db.insert(creditTransactionsTable).values({
        userId: newUser.id,
        type: "topup",
        amount: REFEREE_BONUS,
        note: `Bonus welcome dari program referral (kode: ${refCode})`,
      });
      logger.info({ referrerId: referrer.id, refereeId: newUser.id }, "Referral recorded (Google signup)");
    }

    const sessionId = await createSession(newUser.id);
    setSessionCookie(res, sessionId);
    logger.info({ userId: newUser.id, email }, "New user registered via Google");
    res.redirect("/dashboard");
  } catch (err) {
    logger.error({ err }, "Google OAuth callback error");
    res.redirect("/login?error=google_failed");
  }
});

export default router;
