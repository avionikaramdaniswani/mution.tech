import { Router, type Request, type Response } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable, apiUsageTable } from "@workspace/db";
import { eq, desc, ne, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/leaderboard", requireAuth, async (_req: Request, res: Response) => {
  try {
    // Top Spender By Tokens
    const byTokens = await db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        totalTokens: sql<number>`coalesce(sum(${apiUsageTable.totalTokens}), 0)::int`,
        totalCredits: sql<number>`coalesce(sum(${apiUsageTable.credits}), 0)::int`,
      })
      .from(usersTable)
      .leftJoin(apiUsageTable, eq(usersTable.id, apiUsageTable.userId))
      .where(ne(usersTable.role, "admin"))
      .groupBy(usersTable.id)
      .orderBy(desc(sql`coalesce(sum(${apiUsageTable.totalTokens}), 0)::int`))
      .limit(10);

    // Top Spender By Credits
    const byCredits = await db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        totalTokens: sql<number>`coalesce(sum(${apiUsageTable.totalTokens}), 0)::int`,
        totalCredits: sql<number>`coalesce(sum(${apiUsageTable.credits}), 0)::int`,
      })
      .from(usersTable)
      .leftJoin(apiUsageTable, eq(usersTable.id, apiUsageTable.userId))
      .where(ne(usersTable.role, "admin"))
      .groupBy(usersTable.id)
      .orderBy(desc(sql`coalesce(sum(${apiUsageTable.credits}), 0)::int`))
      .limit(10);

    // Mution Total API Gateway Tokens
    const [{ total }] = await db
      .select({ total: sql<number>`coalesce(sum(${apiUsageTable.totalTokens}), 0)::int` })
      .from(apiUsageTable)
      .innerJoin(usersTable, eq(apiUsageTable.userId, usersTable.id))
      .where(ne(usersTable.role, "admin"));

    res.json({
      success: true,
      data: {
        byTokens,
        byCredits,
        totalTokensUsed: total || 0,
      }
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
