import { Router } from "express";
import { db, apiUsageTable, apiKeysTable } from "@workspace/db";
import { eq, desc, sum, count, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// Get API Usage List with Pagination and Summary
router.get("/api-usage", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get summary for this month
    const [summaryResult] = await db
      .select({
        totalRequests: count(apiUsageTable.id),
        totalCredits: sum(apiUsageTable.credits),
      })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, userId),
          gte(apiUsageTable.createdAt, startOfMonth),
          lte(apiUsageTable.createdAt, endOfMonth)
        )
      );

    // Get paginated list of usage with API Key name
    const usageList = await db
      .select({
        id: apiUsageTable.id,
        model: apiUsageTable.model,
        promptTokens: apiUsageTable.promptTokens,
        completionTokens: apiUsageTable.completionTokens,
        totalTokens: apiUsageTable.totalTokens,
        credits: apiUsageTable.credits,
        createdAt: apiUsageTable.createdAt,
        apiKeyName: apiKeysTable.name,
      })
      .from(apiUsageTable)
      .leftJoin(apiKeysTable, eq(apiUsageTable.keyId, apiKeysTable.id))
      .where(eq(apiUsageTable.userId, userId))
      .orderBy(desc(apiUsageTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalCountResult] = await db
      .select({ count: count(apiUsageTable.id) })
      .from(apiUsageTable)
      .where(eq(apiUsageTable.userId, userId));

    const totalPages = Math.ceil((totalCountResult?.count || 0) / limit);

    return res.json({
      summary: {
        totalRequests: Number(summaryResult?.totalRequests || 0),
        totalCredits: Number(summaryResult?.totalCredits || 0),
      },
      data: usageList,
      pagination: {
        page,
        limit,
        totalItems: totalCountResult?.count || 0,
        totalPages,
      }
    });

  } catch (error) {
    console.error("Failed to fetch API usage:", error);
    return res.status(500).json({ error: "Gagal mengambil data penggunaan API" });
  }
});

export default router;
