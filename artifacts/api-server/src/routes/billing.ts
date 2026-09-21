import { Router } from "express";
import { db, usersTable, creditTransactionsTable, paymentOrdersTable, creditPackagesTable, referralsTable } from "@workspace/db";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { REFERRER_REWARD } from "./referral";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { broadcastToUser, broadcastAdmin } from "../lib/events";
import { z } from "zod";
import {
  getDuitkuBase,
  getPaymentChannels,
  createTransaction,
  checkTransactionStatus,
  verifyCallbackSignature,
  MIN_TOPUP_IDR,
  MAX_TOPUP_IDR,
  TOPUP_PRESETS,
  type DuitkuCallbackPayload,
} from "../lib/duitku";

const router = Router();

type PaymentOrderRow = typeof paymentOrdersTable.$inferSelect;

const CreateDuitkuBody = z.object({
  packageId: z.number().int().optional(),
  amount: z.number().int().min(MIN_TOPUP_IDR).max(MAX_TOPUP_IDR).optional(),
  method: z.string().trim().regex(/^[A-Z0-9_-]{2,32}$/).default("SP"),
}).refine((d) => d.packageId != null || d.amount != null, {
  message: "Harus ada packageId atau amount",
});

function cleanPaymentName(value: string): string {
  return value.replace(/[^\w\s()./-]/g, "").trim().slice(0, 80) || "Unknown";
}

function parseInstructions(value: unknown): { title: string; steps: string[] }[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      title: typeof record.title === "string" ? record.title.slice(0, 120) : "",
      steps: Array.isArray(record.steps)
        ? record.steps
            .filter((step): step is string => typeof step === "string")
            .slice(0, 20)
            .map((step) => step.slice(0, 1000))
        : [],
    };
  }).filter((item) => item.title || item.steps.length > 0);
}

async function creditPaidOrderOnce(order: PaymentOrderRow, paymentName: string) {
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(paymentOrdersTable)
      .set({ status: "paid", paidAt: new Date() })
      .where(and(eq(paymentOrdersTable.id, order.id), ne(paymentOrdersTable.status, "paid")))
      .returning();

    if (!claimed) {
      return {
        processed: false,
        userId: order.userId,
        orderId: order.id,
        creditsAmount: order.creditsAmount,
      };
    }

    const [freshUser] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, claimed.userId))
      .limit(1);

    if (!freshUser) {
      throw new Error(`User ${claimed.userId} not found for paid order ${claimed.id}`);
    }

    const newCredits = freshUser.credits + claimed.creditsAmount;

    await tx
      .update(usersTable)
      .set({ credits: newCredits })
      .where(eq(usersTable.id, claimed.userId));

    await tx.insert(creditTransactionsTable).values({
      userId: claimed.userId,
      type: "topup",
      amount: claimed.creditsAmount,
      note: `Topup via Duitku (${cleanPaymentName(paymentName)}) - ${claimed.invoiceNumber}`,
    });

    // Check if this is the user's first topup → reward referrer if applicable
    const [{ priorPaid }] = await tx
      .select({ priorPaid: count() })
      .from(paymentOrdersTable)
      .where(and(eq(paymentOrdersTable.userId, claimed.userId), eq(paymentOrdersTable.status, "paid"), ne(paymentOrdersTable.id, claimed.id)));

    if (Number(priorPaid) === 0) {
      const [pendingReferral] = await tx
        .select()
        .from(referralsTable)
        .where(and(eq(referralsTable.refereeId, claimed.userId), eq(referralsTable.status, "pending")))
        .limit(1);

      if (pendingReferral) {
        const [referrer] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, pendingReferral.referrerId))
          .limit(1);

        if (referrer) {
          const newReferrerCredits = referrer.credits + REFERRER_REWARD;
          await tx
            .update(usersTable)
            .set({ credits: newReferrerCredits })
            .where(eq(usersTable.id, referrer.id));

          await tx.insert(creditTransactionsTable).values({
            userId: referrer.id,
            type: "topup",
            amount: REFERRER_REWARD,
            note: `Reward referral — teman kamu (ID ${claimed.userId}) berhasil topup pertama`,
          });

          await tx
            .update(referralsTable)
            .set({ status: "rewarded", rewardedAt: new Date() })
            .where(eq(referralsTable.id, pendingReferral.id));
        }
      }
    }

    return {
      processed: true,
      userId: claimed.userId,
      orderId: claimed.id,
      creditsAmount: claimed.creditsAmount,
    };
  });
}

router.get("/billing/topup-config", (_req, res): void => {
  res.json({ presets: TOPUP_PRESETS, min: MIN_TOPUP_IDR, max: MAX_TOPUP_IDR });
});

router.get("/billing/payment-channels", async (_req, res): Promise<void> => {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  if (!merchantCode || !apiKey) {
    res.status(503).json({ error: "Duitku belum dikonfigurasi" });
    return;
  }
  try {
    const channels = await getPaymentChannels(merchantCode, apiKey, 10000, getDuitkuBase());
    res.json(channels.map((c) => ({
      code: c.paymentMethod,
      name: c.paymentName,
      group: "Payment",
      icon_url: c.paymentImage,
      totalFee: c.totalFee,
    })));
  } catch (err) {
    logger.error({ err }, "Failed to fetch Duitku payment channels");
    res.status(502).json({ error: "Gagal mengambil daftar channel pembayaran" });
  }
});

router.post("/billing/topup", requireAuth, (_req, res): void => {
  res.status(410).json({ error: "Topup manual dinonaktifkan. Gunakan endpoint pembayaran Duitku." });
});

router.get("/billing/transactions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const transactions = await db
    .select()
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.userId, user.id))
    .orderBy(desc(creditTransactionsTable.createdAt))
    .limit(50);

  res.json(
    transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: t.amount,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    }))
  );
});

router.get("/billing/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.id, orderId))
    .limit(1);

  if (!order || order.userId !== user.id) { res.status(404).json({ error: "Not found" }); return; }

  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  let duitkuStatus: string | null = null;

  if (merchantCode && apiKey && order.status !== "cancelled" && order.provider === "duitku") {
    try {
      const detail = await checkTransactionStatus({
        merchantCode,
        apiKey,
        merchantOrderId: order.invoiceNumber,
        base: getDuitkuBase(),
      });
      // Duitku statusCode: "00" = success, "01" = pending, "02" = cancelled/failed
      if (detail.statusCode === "00") duitkuStatus = "paid";
      else if (detail.statusCode === "02") duitkuStatus = "expired";
      else duitkuStatus = "pending";
    } catch { /* ignore */ }
  }

  let status: string = order.status;
  if (duitkuStatus && order.status !== "cancelled") {
    status = duitkuStatus;
  }

  res.json({
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    reference: order.duitkuReference ?? order.tripayReference ?? null,
    paymentMethod: null,
    paymentName: null,
    amount: order.amount,
    feeMerchant: null,
    feeCustomer: null,
    totalFee: null,
    amountReceived: null,
    creditsAmount: order.creditsAmount,
    payCode: null,
    payUrl: null,
    checkoutUrl: order.paymentUrl ?? null,
    status,
    createdAt: order.createdAt.toISOString(),
    expiredAt: null,
    paidAt: order.paidAt?.toISOString() ?? null,
    orderItems: [],
    instructions: [],
  });
});

router.post("/billing/orders/:id/sync", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.id, orderId))
    .limit(1);

  if (!order || order.userId !== user.id) { res.status(404).json({ error: "Not found" }); return; }

  if (order.status === "paid") {
    res.json({ status: "paid", creditsAmount: order.creditsAmount });
    return;
  }

  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  if (!merchantCode || !apiKey) { res.status(503).json({ error: "Duitku tidak dikonfigurasi" }); return; }

  // Legacy Tripay orders cannot be synced via Duitku
  if (order.provider === "tripay") {
    res.json({ status: order.status, cannotSync: true });
    return;
  }

  try {
    const base = getDuitkuBase();
    const detail = await checkTransactionStatus({
      merchantCode,
      apiKey,
      merchantOrderId: order.invoiceNumber,
      base,
    });

    logger.info({
      orderId: order.id,
      duitkuStatusCode: detail.statusCode,
      reference: detail.reference,
    }, "Duitku sync detail");

    if (detail.statusCode !== "00") {
      // Not paid yet
      let newStatus = order.status;
      if (detail.statusCode === "02") newStatus = "expired";
      if (newStatus !== order.status) {
        await db.update(paymentOrdersTable)
          .set({ status: newStatus as any })
          .where(eq(paymentOrdersTable.id, order.id));
      }
      res.json({ status: newStatus });
      return;
    }

    // Verify amount matches
    if (parseInt(detail.amount, 10) !== order.amount) {
      logger.warn({ orderId: order.id, expected: order.amount, got: detail.amount }, "Duitku sync amount mismatch");
      res.status(409).json({ error: "Detail pembayaran tidak sesuai dengan order" });
      return;
    }

    const result = await creditPaidOrderOnce(order, "Duitku");

    if (result.processed) {
      // Update duitku reference if available
      if (detail.reference && !order.duitkuReference) {
        await db.update(paymentOrdersTable)
          .set({ duitkuReference: detail.reference })
          .where(eq(paymentOrdersTable.id, order.id));
      }
      broadcastToUser(result.userId, { type: "credits.changed", amount: result.creditsAmount });
      broadcastAdmin({ type: "order.paid", userId: result.userId, orderId: result.orderId });
    }

    res.json({ status: "paid", creditsAmount: result.creditsAmount, processed: result.processed });
  } catch (err) {
    logger.error({ err }, "Duitku sync error");
    res.status(502).json({ error: "Gagal cek status ke Duitku" });
  }
});

router.post("/billing/orders/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.id, orderId))
    .limit(1);

  if (!order || order.userId !== user.id) { res.status(404).json({ error: "Not found" }); return; }
  if (order.status !== "pending") {
    res.status(400).json({ error: "Hanya order dengan status pending yang bisa dibatalkan" });
    return;
  }

  await db
    .update(paymentOrdersTable)
    .set({ status: "cancelled" })
    .where(eq(paymentOrdersTable.id, order.id));

  logger.info({ orderId: order.id, userId: user.id }, "Order cancelled by user");
  res.json({ ok: true, status: "cancelled" });
});

router.get("/billing/orders", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const dbOrders = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.userId, user.id))
    .orderBy(desc(paymentOrdersTable.createdAt))
    .limit(50);

  const result = dbOrders.map((o) => {
    return {
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      reference: o.duitkuReference ?? o.tripayReference ?? null,
      paymentMethod: null,
      paymentName: null,
      amount: o.amount,
      feeMerchant: null,
      feeCustomer: null,
      totalFee: null,
      amountReceived: null,
      creditsAmount: o.creditsAmount,
      payCode: null,
      payUrl: null,
      checkoutUrl: o.paymentUrl ?? null,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      expiredAt: null,
      paidAt: o.paidAt?.toISOString() ?? null,
      orderItems: [],
    };
  });

  res.json(result);
});

router.post("/billing/duitku/create", requireAuth, async (req, res): Promise<void> => {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;

  if (!merchantCode || !apiKey) {
    res.status(503).json({ error: "Duitku belum dikonfigurasi" });
    return;
  }

  const parsed = CreateDuitkuBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nominal tidak valid" });
    return;
  }
  const { packageId, method } = parsed.data;

  // Resolve amount + creditsAmount dari paket atau custom
  let amount: number;
  let creditsAmount: number;
  let itemName: string;

  if (packageId != null) {
    const [pkg] = await db.select().from(creditPackagesTable).where(eq(creditPackagesTable.id, packageId));
    if (!pkg || !pkg.isActive) {
      res.status(400).json({ error: "Paket tidak tersedia" });
      return;
    }
    amount = pkg.priceIdr;
    creditsAmount = pkg.creditsAmount;
    itemName = `${pkg.name} — ${pkg.creditsAmount.toLocaleString("id-ID")} Kredit Mution`;
  } else {
    amount = parsed.data.amount!;
    creditsAmount = amount;
    itemName = `Topup Kredit Mution — ${amount.toLocaleString("id-ID")} Kredit`;
  }

  const user = (req as any).user;
  const invoiceNumber = `MUTION-${Date.now()}-${user.id}`;

  const [order] = await db
    .insert(paymentOrdersTable)
    .values({
      userId: user.id,
      invoiceNumber,
      amount,
      creditsAmount,
      provider: "duitku",
      status: "pending",
    })
    .returning();

  const base = getDuitkuBase();
  const appUrl = (process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://mution.tech").replace(/\/$/, "");
  const callbackUrl = `${appUrl}/api/billing/duitku/webhook`;
  const returnUrl = `${appUrl}/billing?orderId=${order.id}`;

  logger.info({ base, method, amount, creditsAmount, invoiceNumber }, "Calling Duitku API");

  try {
    const duitkuRes = await createTransaction({
      merchantCode,
      apiKey,
      merchantOrderId: invoiceNumber,
      paymentAmount: amount,
      paymentMethod: method,
      productDetails: itemName,
      email: user.email,
      customerVaName: user.name ?? "Mution User",
      callbackUrl,
      returnUrl,
      expiryPeriod: 1440, // 24 jam dalam menit
      base,
    });

    logger.info({
      statusCode: duitkuRes.statusCode,
      reference: duitkuRes.reference,
      invoiceNumber,
    }, "Duitku API response");

    if (duitkuRes.statusCode !== "00" && duitkuRes.statusCode !== "01") {
      await db
        .update(paymentOrdersTable)
        .set({ status: "failed" })
        .where(eq(paymentOrdersTable.id, order.id));
      res.status(502).json({ error: duitkuRes.statusMessage ?? "Gagal membuat transaksi Duitku" });
      return;
    }

    const paymentUrl = duitkuRes.paymentUrl;
    const duitkuReference = duitkuRes.reference;
    await db
      .update(paymentOrdersTable)
      .set({ paymentUrl, duitkuReference })
      .where(eq(paymentOrdersTable.id, order.id));

    res.json({
      orderId: order.id,
      invoiceNumber,
      duitkuReference,
      paymentUrl,
      vaNumber: duitkuRes.vaNumber ?? null,
      qrString: duitkuRes.qrString ?? null,
      amount,
      credits: creditsAmount,
    });
  } catch (err) {
    logger.error({ err }, "Duitku fetch error");
    await db
      .update(paymentOrdersTable)
      .set({ status: "failed" })
      .where(eq(paymentOrdersTable.id, order.id));
    res.status(502).json({ error: "Gagal terhubung ke Duitku" });
  }
});

router.post("/billing/duitku/webhook", async (req, res): Promise<void> => {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  if (!merchantCode || !apiKey) {
    res.status(503).json({ error: "Unconfigured" });
    return;
  }

  // Duitku callback sends form-urlencoded or JSON
  let payload: DuitkuCallbackPayload;
  if (typeof req.body === "object" && req.body !== null) {
    payload = req.body as DuitkuCallbackPayload;
  } else {
    logger.error({ bodyType: typeof req.body }, "Duitku webhook body unexpected format");
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  // Verify signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
  if (!verifyCallbackSignature(
    merchantCode,
    String(payload.amount),
    payload.merchantOrderId,
    apiKey,
    payload.signature,
  )) {
    logger.warn({ merchantOrderId: payload.merchantOrderId }, "Duitku webhook invalid signature");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // resultCode: "00" = success, "01" = pending, "02" = failed
  if (payload.resultCode !== "00") {
    // Update status jika failed
    if (payload.resultCode === "02") {
      await db
        .update(paymentOrdersTable)
        .set({ status: "failed" })
        .where(eq(paymentOrdersTable.invoiceNumber, payload.merchantOrderId));
    }
    res.json({ success: true, message: "Status noted" });
    return;
  }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.invoiceNumber, payload.merchantOrderId))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status === "paid") {
    res.json({ success: true, message: "Already processed" });
    return;
  }

  // Verify amount matches
  if (parseInt(String(payload.amount), 10) !== order.amount) {
    logger.warn({
      orderId: order.id,
      expected: order.amount,
      got: payload.amount,
    }, "Duitku webhook amount mismatch");
    res.status(409).json({ error: "Payment amount does not match order" });
    return;
  }

  // Update duitku reference
  if (payload.reference && !order.duitkuReference) {
    await db.update(paymentOrdersTable)
      .set({ duitkuReference: payload.reference })
      .where(eq(paymentOrdersTable.id, order.id));
  }

  const result = await creditPaidOrderOnce(order, payload.paymentCode ?? "Duitku");

  if (result.processed) {
    broadcastToUser(result.userId, { type: "credits.changed", amount: result.creditsAmount });
    broadcastAdmin({ type: "order.paid", userId: result.userId, orderId: result.orderId });
  }

  res.json({ success: true, processed: result.processed });
});

export default router;
