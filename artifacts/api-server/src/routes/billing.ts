import { Router } from "express";
import { db, usersTable, creditTransactionsTable, paymentOrdersTable, creditPackagesTable, referralsTable } from "@workspace/db";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { REFERRER_REWARD } from "./referral";
import { requireAuth } from "../lib/auth";
import { computePlan } from "../lib/plan";
import { logger } from "../lib/logger";
import { broadcastToUser, broadcastAdmin } from "../lib/events";
import { z } from "zod";
import {
  getTripayBase,
  createOrderSignature,
  verifyCallbackSignature,
  getPaymentChannels,
  MIN_TOPUP_IDR,
  MAX_TOPUP_IDR,
  TOPUP_PRESETS,
  type TripayCreateResponse,
  type TripayCallbackPayload,
  type TripayTransactionDetail,
} from "../lib/tripay";

const router = Router();

type PaymentOrderRow = typeof paymentOrdersTable.$inferSelect;

const CreateTripayBody = z.object({
  packageId: z.number().int().optional(),
  amount: z.number().int().min(MIN_TOPUP_IDR).max(MAX_TOPUP_IDR).optional(),
  method: z.string().trim().regex(/^[A-Z0-9_-]{2,32}$/).default("QRIS"),
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

function isPaidDetailForOrder(order: PaymentOrderRow, detail: TripayTransactionDetail["data"]): boolean {
  return detail.status === "PAID"
    && detail.merchant_ref === order.invoiceNumber
    && detail.total_amount === order.amount
    && (!order.tripayReference || detail.reference === order.tripayReference);
}

function isCallbackForOrder(order: PaymentOrderRow, payload: TripayCallbackPayload): boolean {
  return payload.status === "PAID"
    && payload.merchant_ref === order.invoiceNumber
    && payload.total_amount === order.amount
    && (!order.tripayReference || payload.reference === order.tripayReference);
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
    const newPlan = computePlan(newCredits);

    await tx
      .update(usersTable)
      .set({ credits: newCredits, plan: newPlan })
      .where(eq(usersTable.id, claimed.userId));

    await tx.insert(creditTransactionsTable).values({
      userId: claimed.userId,
      type: "topup",
      amount: claimed.creditsAmount,
      note: `Topup via Tripay (${cleanPaymentName(paymentName)}) - ${claimed.invoiceNumber}`,
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
            .set({ credits: newReferrerCredits, plan: computePlan(newReferrerCredits) })
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
  const apiKey = process.env.TRIPAY_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Tripay belum dikonfigurasi" });
    return;
  }
  try {
    const channels = await getPaymentChannels(apiKey, getTripayBase());
    res.json(channels.map((c) => ({
      code: c.code,
      name: c.name,
      group: c.group,
      icon_url: c.icon_url,
      minimum_amount: c.minimum_amount,
      maximum_amount: c.maximum_amount,
    })));
  } catch (err) {
    logger.error({ err }, "Failed to fetch payment channels");
    res.status(502).json({ error: "Gagal mengambil daftar channel pembayaran" });
  }
});

router.post("/billing/topup", requireAuth, (_req, res): void => {
  res.status(410).json({ error: "Topup manual dinonaktifkan. Gunakan endpoint pembayaran Tripay." });
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

  const apiKey = process.env.TRIPAY_API_KEY;
  let tx: Record<string, unknown> | null = null;

  if (apiKey && order.status !== "cancelled") {
    try {
      const base = getTripayBase();
      // Prefer direct detail lookup by reference if available
      if (order.tripayReference) {
        const r = await fetch(`${base}/transaction/detail?reference=${encodeURIComponent(order.tripayReference)}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const d = await r.json() as { success: boolean; data?: Record<string, unknown> };
        if (d.success && d.data) tx = d.data;
      } else {
        // Fall back to list scan
        const r = await fetch(`${base}/merchant/transactions?per_page=100`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const d = await r.json() as { success: boolean; data?: Record<string, unknown>[] };
        if (d.success && Array.isArray(d.data)) {
          tx = d.data.find((t) => t.merchant_ref === order.invoiceNumber) ?? null;
        }
      }
    } catch { /* ignore */ }
  }

  let status: string = order.status;
  if (tx && order.status !== "cancelled") {
    const ts = String(tx.status ?? "");
    if (ts === "PAID") status = "paid";
    else if (ts === "EXPIRED") status = "expired";
    else if (ts === "FAILED") status = "failed";
    else status = "pending";
  }

  res.json({
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    reference: (tx?.reference as string) ?? order.tripayReference ?? null,
    paymentMethod: (tx?.payment_method as string) ?? null,
    paymentName: (tx?.payment_name as string) ?? null,
    amount: order.amount,
    feeMerchant: (tx?.fee_merchant as number) ?? null,
    feeCustomer: (tx?.fee_customer as number) ?? null,
    totalFee: (tx?.total_fee as number) ?? null,
    amountReceived: (tx?.amount_received as number) ?? null,
    creditsAmount: order.creditsAmount,
    payCode: (tx?.pay_code as string | number) ?? null,
    payUrl: (tx?.pay_url as string) ?? null,
    checkoutUrl: (tx?.checkout_url as string) ?? order.paymentUrl ?? null,
    status,
    createdAt: order.createdAt.toISOString(),
    // detail endpoint uses expired_time; list endpoint uses expired_at
    expiredAt: tx?.expired_time
      ? new Date((tx.expired_time as number) * 1000).toISOString()
      : tx?.expired_at
        ? new Date((tx.expired_at as number) * 1000).toISOString()
        : null,
    paidAt: tx?.paid_at
      ? new Date((tx.paid_at as number) * 1000).toISOString()
      : (order.paidAt?.toISOString() ?? null),
    orderItems: (tx?.order_items as { name: string; price: number; quantity: number; subtotal: number }[]) ?? [],
    instructions: parseInstructions(tx?.instructions),
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

  const apiKey = process.env.TRIPAY_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "Tripay tidak dikonfigurasi" }); return; }

  // Order lama tanpa tripayReference tidak bisa di-sync (TriPay hanya terima reference T-xxx)
  if (!order.tripayReference) {
    res.json({ status: order.status, cannotSync: true });
    return;
  }

  try {
    const base = getTripayBase();
    const tripayRes = await fetch(
      `${base}/transaction/detail?reference=${encodeURIComponent(order.tripayReference)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const detail = await tripayRes.json() as TripayTransactionDetail;
    logger.info({
      orderId: order.id,
      tripayStatus: detail.data?.status,
      reference: detail.data?.reference,
    }, "Tripay sync detail");

    if (!detail.success || detail.data.status !== "PAID") {
      res.json({ status: order.status });
      return;
    }

    if (!isPaidDetailForOrder(order, detail.data)) {
      logger.warn({ orderId: order.id, reference: detail.data.reference }, "Tripay sync detail mismatch");
      res.status(409).json({ error: "Detail pembayaran tidak sesuai dengan order" });
      return;
    }

    const result = await creditPaidOrderOnce(order, detail.data.payment_name);

    if (result.processed) {
      broadcastToUser(result.userId, { type: "credits.changed", amount: result.creditsAmount });
      broadcastAdmin({ type: "order.paid", userId: result.userId, orderId: result.orderId });
    }

    res.json({ status: "paid", creditsAmount: result.creditsAmount, processed: result.processed });
  } catch (err) {
    logger.error({ err }, "Tripay sync error");
    res.status(502).json({ error: "Gagal cek status ke Tripay" });
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
  const apiKey = process.env.TRIPAY_API_KEY;

  const dbOrders = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.userId, user.id))
    .orderBy(desc(paymentOrdersTable.createdAt))
    .limit(50);

  // Fetch TriPay merchant transactions for enrichment
  const tripayMap = new Map<string, Record<string, unknown>>();
  if (apiKey && dbOrders.length > 0) {
    try {
      const base = getTripayBase();
      const r = await fetch(`${base}/merchant/transactions?per_page=100`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await r.json() as { success: boolean; data?: Record<string, unknown>[] };
      if (data.success && Array.isArray(data.data)) {
        for (const tx of data.data) {
          tripayMap.set(tx.merchant_ref as string, tx);
        }
      }
    } catch {
      // ignore — DB only fallback
    }
  }

  const result = dbOrders.map((o) => {
    const tx = tripayMap.get(o.invoiceNumber);

    let status: string = o.status;
    if (tx && o.status !== "cancelled") {
      const ts = String(tx.status ?? "");
      if (ts === "PAID") status = "paid";
      else if (ts === "EXPIRED") status = "expired";
      else if (ts === "FAILED") status = "failed";
      else status = "pending";
    }

    return {
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      reference: (tx?.reference as string) ?? o.tripayReference ?? null,
      paymentMethod: (tx?.payment_method as string) ?? null,
      paymentName: (tx?.payment_name as string) ?? null,
      amount: o.amount,
      feeMerchant: (tx?.fee_merchant as number) ?? null,
      feeCustomer: (tx?.fee_customer as number) ?? null,
      totalFee: (tx?.total_fee as number) ?? null,
      amountReceived: (tx?.amount_received as number) ?? null,
      creditsAmount: o.creditsAmount,
      payCode: (tx?.pay_code as string | number) ?? null,
      payUrl: (tx?.pay_url as string) ?? null,
      checkoutUrl: (tx?.checkout_url as string) ?? o.paymentUrl ?? null,
      status,
      createdAt: o.createdAt.toISOString(),
      expiredAt: tx?.expired_at
        ? new Date((tx.expired_at as number) * 1000).toISOString()
        : null,
      paidAt: tx?.paid_at
        ? new Date((tx.paid_at as number) * 1000).toISOString()
        : (o.paidAt?.toISOString() ?? null),
      orderItems: (tx?.order_items as { name: string; price: number; quantity: number; subtotal: number }[]) ?? [],
    };
  });

  res.json(result);
});

router.post("/billing/tripay/create", requireAuth, async (req, res): Promise<void> => {
  const apiKey = process.env.TRIPAY_API_KEY;
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  const merchantCode = process.env.TRIPAY_MERCHANT_CODE;

  if (!apiKey || !privateKey || !merchantCode) {
    res.status(503).json({ error: "Tripay belum dikonfigurasi" });
    return;
  }

  const parsed = CreateTripayBody.safeParse(req.body);
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
  const signature = createOrderSignature(merchantCode, invoiceNumber, amount, privateKey);

  const [order] = await db
    .insert(paymentOrdersTable)
    .values({
      userId: user.id,
      invoiceNumber,
      amount,
      creditsAmount,
      provider: "tripay",
      status: "pending",
    })
    .returning();

  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const base = getTripayBase();

  logger.info({ base, method, amount, creditsAmount, invoiceNumber }, "Calling Tripay API");

  try {
    const tripayRes = await fetch(`${base}/transaction/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method,
        merchant_ref: invoiceNumber,
        amount,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: "08123456789",
        order_items: [
          {
            name: itemName,
            price: amount,
            quantity: 1,
          },
        ],
        return_url: `https://mution.tech/billing?orderId=${order.id}`,
        expired_time: expiredTime,
        signature,
      }),
    });

    const tripayData = (await tripayRes.json()) as TripayCreateResponse;
    logger.info({
      success: tripayData.success,
      reference: tripayData.data?.reference,
      status: tripayData.data?.status,
      invoiceNumber,
    }, "Tripay API response");

    if (!tripayData.success || tripayData.data?.merchant_ref !== invoiceNumber) {
      await db
        .update(paymentOrdersTable)
        .set({ status: "failed" })
        .where(eq(paymentOrdersTable.id, order.id));
      res.status(502).json({ error: tripayData.message ?? "Gagal membuat transaksi Tripay" });
      return;
    }

    const paymentUrl = tripayData.data.checkout_url ?? tripayData.data.payment_url;
    const tripayReference = tripayData.data.reference; // DEV-xxx / T-xxx — dipakai untuk sync
    await db
      .update(paymentOrdersTable)
      .set({ paymentUrl, tripayReference })
      .where(eq(paymentOrdersTable.id, order.id));

    res.json({ orderId: order.id, invoiceNumber, tripayReference, paymentUrl, amount, credits: amount });
  } catch (err) {
    logger.error({ err }, "Tripay fetch error");
    await db
      .update(paymentOrdersTable)
      .set({ status: "failed" })
      .where(eq(paymentOrdersTable.id, order.id));
    res.status(502).json({ error: "Gagal terhubung ke Tripay" });
  }
});

router.post("/billing/tripay/webhook", async (req, res): Promise<void> => {
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  if (!privateKey) {
    res.status(503).json({ error: "Unconfigured" });
    return;
  }

  // req.body harus Buffer (dari express.raw) — fallback ke string jika perlu
  let rawBody: string;
  if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString("utf-8");
  } else if (typeof req.body === "string") {
    rawBody = req.body;
  } else {
    logger.error({ bodyType: typeof req.body, body: req.body }, "Tripay webhook body bukan Buffer — raw middleware tidak jalan");
    res.status(400).json({ error: "Cannot read raw body" });
    return;
  }

  let payload: TripayCallbackPayload;
  try {
    payload = JSON.parse(rawBody) as TripayCallbackPayload;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (!verifyCallbackSignature(rawBody, payload.signature, privateKey)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  if (payload.status !== "PAID") {
    res.json({ success: true, message: "Status ignored" });
    return;
  }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.invoiceNumber, payload.merchant_ref))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status === "paid") {
    res.json({ success: true, message: "Already processed" });
    return;
  }

  if (!isCallbackForOrder(order, payload)) {
    logger.warn({ orderId: order.id, reference: payload.reference }, "Tripay webhook payload mismatch");
    res.status(409).json({ error: "Payment payload does not match order" });
    return;
  }

  const result = await creditPaidOrderOnce(order, payload.payment_name);

  if (result.processed) {
    broadcastToUser(result.userId, { type: "credits.changed", amount: result.creditsAmount });
    broadcastAdmin({ type: "order.paid", userId: result.userId, orderId: result.orderId });
  }

  res.json({ success: true, processed: result.processed });
});

export default router;
