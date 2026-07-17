/**
 * Referral system routes
 * GET  /referral       — get user's referral code & stats
 * GET  /referral/list  — list of user's referrals with details
 */
import { Router } from "express";
import { db, usersTable, referralsTable, creditTransactionsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

export const REFEREE_BONUS = 5000;    // Rp 5.000 kredit untuk pendaftar baru
export const REFERRER_REWARD = 5000;  // Rp 5.000 kredit untuk pengundang (setelah teman topup pertama)

const router = Router();

router.get("/referral", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user as typeof usersTable.$inferSelect;

  // Make sure user has a referral code (lazy-generate if missing)
  let referralCode = user.referralCode;
  if (!referralCode) {
    const { randomBytes } = await import("crypto");
    referralCode = randomBytes(4).toString("hex");
    await db.update(usersTable).set({ referralCode }).where(eq(usersTable.id, user.id));
  }

  // Fetch all referrals where this user is the referrer
  const referrals = await db
    .select({
      id: referralsTable.id,
      status: referralsTable.status,
      createdAt: referralsTable.createdAt,
      rewardedAt: referralsTable.rewardedAt,
      refereeName: usersTable.name,
      refereeEmail: usersTable.email,
    })
    .from(referralsTable)
    .innerJoin(usersTable, eq(usersTable.id, referralsTable.refereeId))
    .where(eq(referralsTable.referrerId, user.id))
    .orderBy(referralsTable.createdAt);

  const total = referrals.length;
  const pending = referrals.filter((r) => r.status === "pending").length;
  const rewarded = referrals.filter((r) => r.status === "rewarded").length;
  const creditsEarned = rewarded * REFERRER_REWARD;

  res.json({
    referralCode,
    stats: { total, pending, rewarded, creditsEarned },
    referrals: referrals.map((r) => ({
      id: r.id,
      status: r.status,
      refereeName: r.refereeName,
      refereeEmail: r.refereeEmail,
      joinedAt: r.createdAt.toISOString(),
      rewardedAt: r.rewardedAt?.toISOString() ?? null,
    })),
  });
});

export default router;
