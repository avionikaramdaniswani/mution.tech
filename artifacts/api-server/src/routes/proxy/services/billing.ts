import type { Response } from "express";
import { db, apiKeysTable, usersTable, creditTransactionsTable, apiUsageTable, userTokenPackagesTable } from "@workspace/db";
import { and, asc, eq, sql, gt } from "drizzle-orm";
import { logger } from "../../../lib/logger";
import { broadcastToUser, broadcastAdmin } from "../../../lib/events";
import { _modelPricingOverrides, getModelBasePricing } from "./providers";
import { updateApiRequestLog } from "./logging";
import type { CreditReservation, CreditBreakdown } from "../types";
import {
  MAX_OUTPUT_TOKENS,
  DEFAULT_OUTPUT_TOKENS,
  FALLBACK_MAX_TOKENS,
  MODEL_PRICING_TOKEN_UNIT,
} from "../types";

export function estimateFallbackTokens(reqBody: any): number {
  try {
    const msgs = reqBody?.messages;
    if (Array.isArray(msgs)) {
      let chars = 0;
      for (const m of msgs) {
        if (typeof m.content === "string") chars += m.content.length;
        else if (Array.isArray(m.content)) {
          for (const b of m.content) if (b.type === "text") chars += (b.text ?? "").length;
        }
      }
      return Math.min(Math.max(1, Math.ceil(chars / 4)), FALLBACK_MAX_TOKENS);
    }
  } catch { }
  return FALLBACK_MAX_TOKENS;
}

export function estimateInputTokens(reqBody: any): number {
  try {
    let chars = 0;
    if (typeof reqBody?.system === "string") chars += reqBody.system.length;
    const msgs = reqBody?.messages;
    if (Array.isArray(msgs)) {
      for (const m of msgs) {
        if (typeof m.content === "string") chars += m.content.length;
        else if (Array.isArray(m.content)) {
          for (const b of m.content) if (b.type === "text") chars += String(b.text ?? "").length;
        } else {
          chars += String(m.content ?? "").length;
        }
      }
    } else {
      chars = JSON.stringify(reqBody ?? {}).length;
    }
    return Math.max(1, chars);
  } catch {
    return FALLBACK_MAX_TOKENS;
  }
}

export function getRequestedOutputTokens(body: any): number | null {
  let raw = body?.max_tokens ?? body?.max_completion_tokens;
  if (raw === undefined || raw === null) {
    raw = DEFAULT_OUTPUT_TOKENS;
  }
  if (typeof raw === "string") {
    raw = parseInt(raw, 10);
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || isNaN(raw)) {
    return DEFAULT_OUTPUT_TOKENS;
  }
  if (raw < 1) return 1;
  if (raw > MAX_OUTPUT_TOKENS) return MAX_OUTPUT_TOKENS;
  return raw;
}

export function getReservationOutputTokens(path: string, body: any): number | null {
  if (path === "/embeddings") return 0;
  return getRequestedOutputTokens(body);
}

export function extractCachedTokens(usage: any): number {
  if (!usage) return 0;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? usage.cache_read_input_tokens;
  return typeof cached === "number" && cached > 0 ? cached : 0;
}

export function detectModelTokenCategory(model: string): "claude" | "gpt" | null {
  const m = model.toLowerCase();
  if (m.includes("claude")) return "claude";
  if (m.includes("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.includes("/o1") || m.includes("/o3") || m.includes("/o4")) return "gpt";
  return null;
}

export async function getActiveTokenPackage(userId: number, category: "claude" | "gpt") {
  const now = new Date();
  const [pkg] = await db
    .select()
    .from(userTokenPackagesTable)
    .where(
      and(
        eq(userTokenPackagesTable.userId, userId),
        eq(userTokenPackagesTable.category, category),
        eq(userTokenPackagesTable.isActive, true),
        gt(userTokenPackagesTable.remainingTokens, 0),
        gt(userTokenPackagesTable.expiresAt, now),
      ),
    )
    .orderBy(asc(userTokenPackagesTable.expiresAt))
    .limit(1);
  return pkg ?? null;
}

export function calculateCredits(tokensUsed: number, model: string, breakdown?: CreditBreakdown): number {
  const inputTokens = breakdown?.inputTokens ?? 0;
  const outputTokens = breakdown?.outputTokens ?? (inputTokens === 0 ? tokensUsed : 0);

  const override = _modelPricingOverrides.get(model);

  if (override?.mode === "free") return 0;

  const basePricing = getModelBasePricing(model);
  let inputPrice = basePricing.input;
  let outputPrice = basePricing.output;

  if (override?.mode === "discount_percent" && override.discountPercent != null) {
    const factor = 1 - Math.min(100, Math.max(0, override.discountPercent)) / 100;
    inputPrice = inputPrice * factor;
    outputPrice = outputPrice * factor;
  } else if (override?.mode === "fixed_price") {
    if (override.inputPriceOverride != null) inputPrice = Number.parseFloat(override.inputPriceOverride);
    if (override.outputPriceOverride != null) outputPrice = Number.parseFloat(override.outputPriceOverride);
  }

  const inputCredits = (inputTokens * inputPrice) / MODEL_PRICING_TOKEN_UNIT;
  const outputCredits = (outputTokens * outputPrice) / MODEL_PRICING_TOKEN_UNIT;
  return Math.max(1, Math.ceil(inputCredits + outputCredits));
}

export function estimateReserveCredits(reqBody: any, model: string, requestedOutputTokens: number): number {
  const inputTokens = estimateInputTokens(reqBody);
  return calculateCredits(inputTokens + requestedOutputTokens, model, {
    inputTokens,
    outputTokens: requestedOutputTokens,
  });
}

export async function reserveCredits(userId: number, keyId: number, credits: number, model?: string): Promise<CreditReservation | null> {
  const category = model ? detectModelTokenCategory(model) : null;
  if (category) {
    const tokenPkg = await getActiveTokenPackage(userId, category);
    if (tokenPkg) {
      return {
        userId,
        keyId,
        credits: 0,
        tokenPackageId: tokenPkg.id,
        tokenCategory: category,
      };
    }
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${keyId})`);

    const [key] = await tx.select().from(apiKeysTable).where(eq(apiKeysTable.id, keyId)).limit(1);
    if (!key || !key.isActive) return null;
    if (key.creditLimit !== null && key.totalCreditsUsed + credits > key.creditLimit) return null;

    const [reservedUser] = await tx
      .update(usersTable)
      .set({ credits: sql`${usersTable.credits} - ${credits}` })
      .where(and(eq(usersTable.id, userId), sql`${usersTable.credits} >= ${credits}`))
      .returning({ id: usersTable.id });

    if (!reservedUser) return null;

    await tx
      .update(apiKeysTable)
      .set({ totalCreditsUsed: sql`${apiKeysTable.totalCreditsUsed} + ${credits}` })
      .where(eq(apiKeysTable.id, keyId));

    return { userId, keyId, credits };
  });
}

export async function refundReservation(reservation: CreditReservation): Promise<void> {
  if (reservation.tokenPackageId) {
    return;
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${reservation.keyId})`);
    await tx
      .update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${reservation.credits}` })
      .where(eq(usersTable.id, reservation.userId));
    await tx
      .update(apiKeysTable)
      .set({ totalCreditsUsed: sql`GREATEST(0, ${apiKeysTable.totalCreditsUsed} - ${reservation.credits})` })
      .where(eq(apiKeysTable.id, reservation.keyId));
  });
}

export async function finalizeCredits(
  reservation: CreditReservation,
  tokensUsed: number,
  model: string,
  breakdown?: CreditBreakdown,
): Promise<void> {
  const inputTokens = breakdown?.inputTokens ?? 0;
  const outputTokens = breakdown?.outputTokens ?? (inputTokens === 0 ? tokensUsed : 0);
  const cachedTokens = Math.min(breakdown?.cachedTokens ?? 0, inputTokens);

  if (reservation.tokenPackageId) {
    let remainingAfter = 0;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${reservation.tokenPackageId!})`);
      const [pkg] = await tx
        .select()
        .from(userTokenPackagesTable)
        .where(eq(userTokenPackagesTable.id, reservation.tokenPackageId!))
        .limit(1);

      if (pkg) {
        remainingAfter = Math.max(0, pkg.remainingTokens - tokensUsed);
        const isActive = remainingAfter > 0 && pkg.expiresAt > new Date();
        await tx
          .update(userTokenPackagesTable)
          .set({
            remainingTokens: remainingAfter,
            isActive,
            updatedAt: new Date(),
          })
          .where(eq(userTokenPackagesTable.id, pkg.id));
      }

      await tx.insert(apiUsageTable).values({
        userId: reservation.userId,
        keyId: reservation.keyId,
        model,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: tokensUsed,
        cachedTokens,
        credits: 0,
      });

      await tx
        .update(apiKeysTable)
        .set({
          lastUsedAt: new Date(),
          totalTokensUsed: sql`${apiKeysTable.totalTokensUsed} + ${tokensUsed}`,
          totalRequestsCount: sql`${apiKeysTable.totalRequestsCount} + 1`,
        })
        .where(eq(apiKeysTable.id, reservation.keyId));
    });

    broadcastToUser(reservation.userId, {
      type: "token_package.used",
      packageId: reservation.tokenPackageId,
      remainingTokens: remainingAfter,
      category: reservation.tokenCategory,
    });
    return;
  }

  const credits = calculateCredits(tokensUsed, model, { inputTokens, outputTokens });
  const adjustment = reservation.credits - credits;

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${reservation.keyId})`);

    if (adjustment > 0) {
      await tx
        .update(usersTable)
        .set({ credits: sql`${usersTable.credits} + ${adjustment}` })
        .where(eq(usersTable.id, reservation.userId));
      await tx
        .update(apiKeysTable)
        .set({ totalCreditsUsed: sql`GREATEST(0, ${apiKeysTable.totalCreditsUsed} - ${adjustment})` })
        .where(eq(apiKeysTable.id, reservation.keyId));
    } else if (adjustment < 0) {
      const extra = Math.abs(adjustment);
      await tx
        .update(usersTable)
        .set({ credits: sql`GREATEST(0, ${usersTable.credits} - ${extra})` })
        .where(eq(usersTable.id, reservation.userId));
      await tx
        .update(apiKeysTable)
        .set({ totalCreditsUsed: sql`${apiKeysTable.totalCreditsUsed} + ${extra}` })
        .where(eq(apiKeysTable.id, reservation.keyId));
    }

    await tx.insert(creditTransactionsTable).values({
      userId: reservation.userId,
      type: "usage",
      amount: -credits,
      note: `API - model: ${model}, tokens: ${tokensUsed}`,
    });

    await tx.insert(apiUsageTable).values({
      userId: reservation.userId,
      keyId: reservation.keyId,
      model,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: tokensUsed,
      cachedTokens,
      credits,
    });

    await tx
      .update(apiKeysTable)
      .set({
        lastUsedAt: new Date(),
        totalTokensUsed: sql`${apiKeysTable.totalTokensUsed} + ${tokensUsed}`,
        totalRequestsCount: sql`${apiKeysTable.totalRequestsCount} + 1`,
      })
      .where(eq(apiKeysTable.id, reservation.keyId));
  });

  broadcastToUser(reservation.userId, { type: "credits.changed", amount: -credits });
  broadcastAdmin({ type: "user.credits_adjusted", userId: reservation.userId, amount: -credits });
}

export async function finalizeReservation(
  reservation: CreditReservation,
  tokensUsed: number,
  model: string,
  breakdown?: CreditBreakdown,
): Promise<boolean> {
  try {
    await finalizeCredits(reservation, tokensUsed, model, breakdown);
    return true;
  } catch (err) {
    logger.error({ err, userId: reservation.userId, keyId: reservation.keyId, model }, "finalize credits failed");
    return false;
  }
}

export async function refundUnfinalizedReservation(reservation: CreditReservation): Promise<void> {
  try {
    await refundReservation(reservation);
  } catch (err) {
    logger.error({ err, userId: reservation.userId, keyId: reservation.keyId }, "refund credit reservation failed");
  }
}

export function updateApiRequestUsageLog(
  res: Response,
  tokensUsed: number,
  model: string,
  breakdown?: CreditBreakdown,
  isTokenPackage = false,
): void {
  const inputTokens = breakdown?.inputTokens ?? 0;
  const outputTokens = breakdown?.outputTokens ?? (inputTokens === 0 ? tokensUsed : 0);
  const cachedTokens = Math.min(breakdown?.cachedTokens ?? 0, inputTokens);
  updateApiRequestLog(res, {
    model,
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: tokensUsed,
    cachedTokens,
    credits: isTokenPackage ? 0 : calculateCredits(tokensUsed, model, { inputTokens, outputTokens }),
  });
}

