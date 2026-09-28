import { Router } from "express";
import { db, apiRequestsTable, apiKeysTable, apiUsageDailyTable } from "@workspace/db";
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
    "request_id",
    "created_at",
    "endpoint",
    "method",
    "api_key",
    "model",
    "provider_id",
    "status_code",
    "success",
    "error_type",
    "latency_ms",
    "prompt_tokens",
    "cached_tokens",
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
    const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;
    const fromDate = parseDateParam(req.query.from, startOfCurrentMonth());
    const toDate = parseDateParam(req.query.to, endOfToday(), true);
    const model = typeof req.query.model === "string" && req.query.model.trim()
      ? req.query.model.trim()
      : null;
    const status = req.query.status === "success" || req.query.status === "error"
      ? req.query.status
      : null;
    const keyId = typeof req.query.keyId === "string" && req.query.keyId.trim()
      ? Number(req.query.keyId)
      : null;
    const format = typeof req.query.format === "string" ? req.query.format : "json";

    const filters: SQL[] = [
      eq(apiRequestsTable.userId, userId),
      gte(apiRequestsTable.createdAt, fromDate),
      lte(apiRequestsTable.createdAt, toDate),
    ];
    if (model) filters.push(eq(apiRequestsTable.model, model));
    if (status === "success") filters.push(eq(apiRequestsTable.success, true));
    if (status === "error") filters.push(eq(apiRequestsTable.success, false));
    if (Number.isInteger(keyId)) filters.push(eq(apiRequestsTable.keyId, keyId as number));

    const whereClause = and(...filters);
    if (!whereClause) {
      res.status(400).json({ error: "Filter tidak valid" });
      return;
    }

    const usageSelect = {
      id: apiRequestsTable.id,
      requestId: apiRequestsTable.requestId,
      keyId: apiRequestsTable.keyId,
      endpoint: apiRequestsTable.endpoint,
      method: apiRequestsTable.method,
      model: apiRequestsTable.model,
      providerId: apiRequestsTable.providerId,
      statusCode: apiRequestsTable.statusCode,
      success: apiRequestsTable.success,
      errorType: apiRequestsTable.errorType,
      latencyMs: apiRequestsTable.latencyMs,
      promptTokens: apiRequestsTable.promptTokens,
      cachedTokens: apiRequestsTable.cachedTokens,
      completionTokens: apiRequestsTable.completionTokens,
      totalTokens: apiRequestsTable.totalTokens,
      credits: apiRequestsTable.credits,
      createdAt: apiRequestsTable.createdAt,
      apiKeyName: apiKeysTable.name,
    };

    if (format === "csv") {
      const csvRows = await db
        .select(usageSelect)
        .from(apiRequestsTable)
        .leftJoin(apiKeysTable, eq(apiRequestsTable.keyId, apiKeysTable.id))
        .where(whereClause)
        .orderBy(desc(apiRequestsTable.createdAt))
        .limit(5000);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mution-api-usage-${toDateInputValue(fromDate)}-to-${toDateInputValue(toDate)}.csv"`,
      );
      res.send(toCsv(csvRows.map((row) => ({
        request_id: row.requestId,
        created_at: row.createdAt.toISOString(),
        endpoint: row.endpoint,
        method: row.method,
        api_key: row.apiKeyName ?? "Deleted API Key",
        model: row.model ?? "",
        provider_id: row.providerId ?? "",
        status_code: row.statusCode,
        success: row.success,
        error_type: row.errorType ?? "",
        latency_ms: row.latencyMs,
        prompt_tokens: row.promptTokens,
        cached_tokens: row.cachedTokens,
        completion_tokens: row.completionTokens,
        total_tokens: row.totalTokens,
        credits: row.credits,
      }))));
      return;
    }

    const dailyFilters: SQL[] = [
      eq(apiUsageDailyTable.userId, userId),
      gte(apiUsageDailyTable.date, toDateInputValue(fromDate)),
      lte(apiUsageDailyTable.date, toDateInputValue(toDate)),
    ];
    if (model) dailyFilters.push(eq(apiUsageDailyTable.model, model));
    if (status === "success") dailyFilters.push(eq(apiUsageDailyTable.status, "success"));
    if (status === "error") dailyFilters.push(eq(apiUsageDailyTable.status, "error"));
    if (Number.isInteger(keyId)) dailyFilters.push(eq(apiUsageDailyTable.keyId, keyId as number));
    const whereDailyClause = and(...dailyFilters);

    const [summaryResult] = await db
      .select({
        totalRequests: sql<number>`coalesce(sum(${apiUsageDailyTable.totalRequests}), 0)::int`,
        successfulRequests: sql<number>`coalesce(sum(case when ${apiUsageDailyTable.status} = 'success' then ${apiUsageDailyTable.totalRequests} else 0 end), 0)::int`,
        failedRequests: sql<number>`coalesce(sum(case when ${apiUsageDailyTable.status} = 'error' then ${apiUsageDailyTable.totalRequests} else 0 end), 0)::int`,
        totalCredits: sql<number>`coalesce(sum(${apiUsageDailyTable.totalCredits}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${apiUsageDailyTable.totalTokens}), 0)::int`,
        promptTokens: sql<number>`coalesce(sum(${apiUsageDailyTable.promptTokens}), 0)::int`,
        cachedTokens: sql<number>`coalesce(sum(${apiUsageDailyTable.cachedTokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${apiUsageDailyTable.completionTokens}), 0)::int`,
        averageLatencyMs: sql<number>`0`, // Latency is not tracked daily
      })
      .from(apiUsageDailyTable)
      .where(whereDailyClause);

    const usageList = await db
      .select(usageSelect)
      .from(apiRequestsTable)
      .leftJoin(apiKeysTable, eq(apiRequestsTable.keyId, apiKeysTable.id))
      .where(whereClause)
      .orderBy(desc(apiRequestsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCountResult] = await db
      .select({ count: count(apiRequestsTable.id) })
      .from(apiRequestsTable)
      .where(whereClause);

    const daily = await db
      .select({
        day: sql<string>`to_char(${apiUsageDailyTable.date}::date, 'YYYY-MM-DD')`,
        requests: sql<number>`coalesce(sum(${apiUsageDailyTable.totalRequests}), 0)::int`,
        errors: sql<number>`coalesce(sum(case when ${apiUsageDailyTable.status} = 'error' then ${apiUsageDailyTable.totalRequests} else 0 end), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${apiUsageDailyTable.totalTokens}), 0)::int`,
        credits: sql<number>`coalesce(sum(${apiUsageDailyTable.totalCredits}), 0)::int`,
      })
      .from(apiUsageDailyTable)
      .where(whereDailyClause)
      .groupBy(apiUsageDailyTable.date)
      .orderBy(asc(apiUsageDailyTable.date));

    const modelRows = await db
      .select({ model: apiUsageDailyTable.model })
      .from(apiUsageDailyTable)
      .where(eq(apiUsageDailyTable.userId, userId))
      .groupBy(apiUsageDailyTable.model)
      .orderBy(apiUsageDailyTable.model);

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
        successfulRequests: Number(summaryResult?.successfulRequests || 0),
        failedRequests: Number(summaryResult?.failedRequests || 0),
        totalCredits: Number(summaryResult?.totalCredits || 0),
        totalTokens: Number(summaryResult?.totalTokens || 0),
        promptTokens: Number(summaryResult?.promptTokens || 0),
        cachedTokens: Number(summaryResult?.cachedTokens || 0),
        completionTokens: Number(summaryResult?.completionTokens || 0),
        averageLatencyMs: Number(summaryResult?.averageLatencyMs || 0),
      },
      data: usageList.map((item) => ({
        ...item,
        apiKeyName: item.apiKeyName ?? "Deleted API Key",
        createdAt: item.createdAt.toISOString(),
      })),
      daily: daily.map((item) => ({
        day: item.day,
        requests: Number(item.requests || 0),
        errors: Number(item.errors || 0),
        totalTokens: Number(item.totalTokens || 0),
        credits: Number(item.credits || 0),
      })),
      filters: {
        from: toDateInputValue(fromDate),
        to: toDateInputValue(toDate),
        model,
        status,
        keyId: Number.isInteger(keyId) ? keyId : null,
        models: modelRows.map((row) => row.model).filter((value): value is string => Boolean(value)),
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
