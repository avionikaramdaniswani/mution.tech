import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db, apiRequestsTable, apiUsageDailyTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../../lib/logger";
import type { ApiRequestLogState } from "../types";

export function getApiRequestLog(res: Response): ApiRequestLogState | null {
  return (res.locals as { apiRequestLog?: ApiRequestLogState }).apiRequestLog ?? null;
}

export function updateApiRequestLog(res: Response, patch: Partial<ApiRequestLogState>): void {
  const state = getApiRequestLog(res);
  if (state) Object.assign(state, patch);
}

export function classifyErrorType(statusCode: number): string | null {
  if (statusCode < 400) return null;
  if (statusCode === 400) return "invalid_request_error";
  if (statusCode === 401) return "authentication_error";
  if (statusCode === 402) return "insufficient_quota";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 429) return "rate_limit";
  if (statusCode >= 500) return "api_error";
  return "http_error";
}

/** One-line snippet of a non-JSON upstream body, surfaced in the 502 message so callers can see what the provider actually returned. */
export function upstreamBodySnippet(text: string, max = 200): string {
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, max);
  return snippet ? `: ${snippet}` : "";
}

export async function writeApiRequestLog(state: ApiRequestLogState, statusCode: number): Promise<void> {
  const errorType = state.errorType ?? classifyErrorType(statusCode);
  const success = statusCode < 400 && !errorType;

  try {
    await db.insert(apiRequestsTable).values({
      requestId: state.requestId,
      userId: state.userId ?? null,
      keyId: state.keyId ?? null,
      endpoint: state.endpoint,
      method: state.method,
      model: state.model ?? null,
      providerId: state.providerId ?? null,
      statusCode,
      success,
      errorType,
      latencyMs: Math.max(0, Date.now() - state.startedAt),
      promptTokens: state.promptTokens ?? 0,
      completionTokens: state.completionTokens ?? 0,
      totalTokens: state.totalTokens ?? 0,
      cachedTokens: state.cachedTokens ?? 0,
      credits: state.credits ?? 0,
    }).onConflictDoNothing({ target: apiRequestsTable.requestId });

    if (state.userId) {
      const today = new Date().toISOString().split("T")[0]!;
      const statusStr = success ? "success" : "error";
      await db.insert(apiUsageDailyTable).values({
        userId: state.userId,
        keyId: state.keyId ?? -1,
        model: state.model ?? "",
        status: statusStr,
        date: today,
        totalRequests: 1,
        promptTokens: state.promptTokens ?? 0,
        completionTokens: state.completionTokens ?? 0,
        cachedTokens: state.cachedTokens ?? 0,
        totalTokens: state.totalTokens ?? 0,
        totalCredits: state.credits ?? 0,
      }).onConflictDoUpdate({
        target: [
          apiUsageDailyTable.userId,
          apiUsageDailyTable.keyId,
          apiUsageDailyTable.model,
          apiUsageDailyTable.status,
          apiUsageDailyTable.date
        ],
        set: {
          totalRequests: sql`${apiUsageDailyTable.totalRequests} + 1`,
          promptTokens: sql`${apiUsageDailyTable.promptTokens} + ${state.promptTokens ?? 0}`,
          completionTokens: sql`${apiUsageDailyTable.completionTokens} + ${state.completionTokens ?? 0}`,
          cachedTokens: sql`${apiUsageDailyTable.cachedTokens} + ${state.cachedTokens ?? 0}`,
          totalTokens: sql`${apiUsageDailyTable.totalTokens} + ${state.totalTokens ?? 0}`,
          totalCredits: sql`${apiUsageDailyTable.totalCredits} + ${state.credits ?? 0}`,
        }
      });
    }
  } catch (err) {
    logger.error({ err, requestId: state.requestId }, "Failed to write API request log");
  }
}

export function apiRequestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  (res.locals as { apiRequestLog?: ApiRequestLogState }).apiRequestLog = {
    requestId,
    startedAt: Date.now(),
    endpoint: req.path,
    method: req.method,
    model: typeof req.body?.model === "string" ? req.body.model : null,
  };
  res.setHeader("X-Request-ID", requestId);
  res.on("finish", () => {
    const state = getApiRequestLog(res);
    if (state) void writeApiRequestLog(state, res.statusCode);
  });
  next();
}
