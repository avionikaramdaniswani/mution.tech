import { Router } from "express";
import { db, apiUsageTable, apiKeysTable } from "@workspace/db";
import { and, asc, count, desc, eq, gte, lte, sum, sql, type SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

function parseDateParam(value: unknown, fallback: Date, endOfDay = false): Date {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  const headers = [
    "created_at",
    "api_key",
    "model",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "credits",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

router.get("/api-usage", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;
    const fromDate = parseDateParam(req.query.from, startOfCurrentMonth());
    const toDate = parseDateParam(req.query.to, endOfToday(), true);
    const model = typeof req.query.model === "string" && req.query.model.trim()
      ? req.query.model.trim()
      : null;
    const keyId = typeof req.query.keyId === "string" && req.query.keyId.trim()
      ? Number(req.query.keyId)
      : null;
    const format = typeof req.query.format === "string" ? req.query.format : "json";

    const filters: SQL[] = [
      eq(apiUsageTable.userId, userId),
      gte(apiUsageTable.createdAt, fromDate),
      lte(apiUsageTable.createdAt, toDate),
    ];
    if (model) filters.push(eq(apiUsageTable.model, model));
    if (Number.isInteger(keyId)) filters.push(eq(apiUsageTable.keyId, keyId as number));

    const whereClause = and(...filters);
    if (!whereClause) {
      res.status(400).json({ error: "Filter tidak valid" });
      return;
    }

    const usageSelect = {
      id: apiUsageTable.id,
      keyId: apiUsageTable.keyId,
      model: apiUsageTable.model,
      promptTokens: apiUsageTable.promptTokens,
      completionTokens: apiUsageTable.completionTokens,
      totalTokens: apiUsageTable.totalTokens,
      credits: apiUsageTable.credits,
      createdAt: apiUsageTable.createdAt,
      apiKeyName: apiKeysTable.name,
    };

    if (format === "csv") {
      const csvRows = await db
        .select(usageSelect)
        .from(apiUsageTable)
        .leftJoin(apiKeysTable, eq(apiUsageTable.keyId, apiKeysTable.id))
        .where(whereClause)
        .orderBy(desc(apiUsageTable.createdAt))
        .limit(5000);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mution-api-usage-${toDateInputValue(fromDate)}-to-${toDateInputValue(toDate)}.csv"`,
      );
      res.send(toCsv(csvRows.map((row) => ({
        created_at: row.createdAt.toISOString(),
        api_key: row.apiKeyName ?? "Deleted API Key",
        model: row.model,
        prompt_tokens: row.promptTokens,
        completion_tokens: row.completionTokens,
        total_tokens: row.totalTokens,
        credits: row.credits,
      }))));
      return;
    }

    const [summaryResult] = await db
      .select({
        totalRequests: count(apiUsageTable.id),
        totalCredits: sum(apiUsageTable.credits),
        totalTokens: sum(apiUsageTable.totalTokens),
        promptTokens: sum(apiUsageTable.promptTokens),
        completionTokens: sum(apiUsageTable.completionTokens),
      })
      .from(apiUsageTable)
      .where(whereClause);

    const usageList = await db
      .select(usageSelect)
      .from(apiUsageTable)
      .leftJoin(apiKeysTable, eq(apiUsageTable.keyId, apiKeysTable.id))
      .where(whereClause)
      .orderBy(desc(apiUsageTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCountResult] = await db
      .select({ count: count(apiUsageTable.id) })
      .from(apiUsageTable)
      .where(whereClause);

    const dayCol = sql<string>`to_char(date_trunc('day', ${apiUsageTable.createdAt}), 'YYYY-MM-DD')`;
    const daily = await db
      .select({
        day: dayCol,
        requests: count(apiUsageTable.id),
        totalTokens: sum(apiUsageTable.totalTokens),
        credits: sum(apiUsageTable.credits),
      })
      .from(apiUsageTable)
      .where(whereClause)
      .groupBy(dayCol)
      .orderBy(asc(dayCol));

    const modelRows = await db
      .select({ model: apiUsageTable.model })
      .from(apiUsageTable)
      .where(eq(apiUsageTable.userId, userId))
      .groupBy(apiUsageTable.model)
      .orderBy(apiUsageTable.model);

    const apiKeys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        isActive: apiKeysTable.isActive,
      })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.userId, userId), eq(apiKeysTable.isActive, true)))
      .orderBy(desc(apiKeysTable.createdAt));

    const totalItems = Number(totalCountResult?.count || 0);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      summary: {
        totalRequests: Number(summaryResult?.totalRequests || 0),
        totalCredits: Number(summaryResult?.totalCredits || 0),
        totalTokens: Number(summaryResult?.totalTokens || 0),
        promptTokens: Number(summaryResult?.promptTokens || 0),
        completionTokens: Number(summaryResult?.completionTokens || 0),
      },
      data: usageList.map((item) => ({
        ...item,
        apiKeyName: item.apiKeyName ?? "Deleted API Key",
        createdAt: item.createdAt.toISOString(),
      })),
      daily: daily.map((item) => ({
        day: item.day,
        requests: Number(item.requests || 0),
        totalTokens: Number(item.totalTokens || 0),
        credits: Number(item.credits || 0),
      })),
      filters: {
        from: toDateInputValue(fromDate),
        to: toDateInputValue(toDate),
        model,
        keyId: Number.isInteger(keyId) ? keyId : null,
        models: modelRows.map((row) => row.model),
        apiKeys,
      },
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
    return;
  } catch (error) {
    console.error("Failed to fetch API usage:", error);
    res.status(500).json({ error: "Gagal mengambil data penggunaan API" });
    return;
  }
});

export default router;
