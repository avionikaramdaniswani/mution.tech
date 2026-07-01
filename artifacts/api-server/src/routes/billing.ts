import { Router } from "express";
import { db, usersTable, creditTransactionsTable, paymentOrdersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { TopupCreditsBody } from "@workspace/api-zod";
import { computePlan } from "../lib/plan";
import { logger } from "../lib/logger";
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

router.post("/billing/topup", requireAuth, async (req, res): Promise<void> => {
  const parsed = TopupCreditsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nominal topup minimal Rp 1.000" });
    return;
  }

  const { amount } = parsed.data;
  const user = (req as any).user;
  const newCredits = user.credits + amount;
  const newPlan = computePlan(newCredits);

  const [updated] = await db
    .update(usersTable)
    .set({ credits: newCredits, plan: newPlan })
    .where(eq(usersTable.id, user.id))
    .returning({ credits: usersTable.credits, plan: usersTable.plan });

  await db.insert(creditTransactionsTable).values({
    userId: user.id,
    type: "topup",
    amount,
    note: `Topup manual Rp ${amount.toLocaleString("id-ID")}`,
  });

  res.json({ credits: updated.credits, added: amount });
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
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.id, orderId))
    .limit(1);

  if (!order || order.userId !== user.id) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    amount: order.amount,
    creditsAmount: order.creditsAmount,
    status: order.status,
    paymentUrl: order.paymentUrl,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
  });
});

router.post("/billing/orders/:id/sync", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(req.params.id, 10);
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
    logger.info({ detail }, "Tripay sync detail");

    if (!detail.success || detail.data.status !== "PAID") {
      res.json({ status: order.status });
      return;
    }

    // Status PAID di Tripay — update DB dan tambah kredit
    await db.transaction(async (tx) => {
      const [freshUser] = await tx.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
      const newCredits = freshUser.credits + order.creditsAmount;
      const newPlan = computePlan(newCredits);
      await tx.update(usersTable).set({ credits: newCredits, plan: newPlan }).where(eq(usersTable.id, user.id));
      await tx.update(paymentOrdersTable)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(paymentOrdersTable.id, order.id));
      await tx.insert(creditTransactionsTable).values({
        userId: user.id,
        type: "topup",
        amount: order.creditsAmount,
        note: `Topup via Tripay (${detail.data.payment_name}) — ${order.invoiceNumber}`,
      });
    });

    res.json({ status: "paid", creditsAmount: order.creditsAmount });
  } catch (err) {
    logger.error({ err }, "Tripay sync error");
    res.status(502).json({ error: "Gagal cek status ke Tripay" });
  }
});

router.post("/billing/orders/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(req.params.id, 10);
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

  const { amount, method = "QRIS" } = req.body as { amount: number; method?: string };

  if (!amount || typeof amount !== "number" || !Number.isInteger(amount)) {
    res.status(400).json({ error: "Nominal tidak valid" });
    return;
  }
  if (amount < MIN_TOPUP_IDR) {
    res.status(400).json({ error: `Minimal topup Rp ${MIN_TOPUP_IDR.toLocaleString("id-ID")}` });
    return;
  }
  if (amount > MAX_TOPUP_IDR) {
    res.status(400).json({ error: `Maksimal topup Rp ${MAX_TOPUP_IDR.toLocaleString("id-ID")}` });
    return;
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
      creditsAmount: amount,
      provider: "tripay",
      status: "pending",
    })
    .returning();

  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const base = getTripayBase();

  logger.info({ base, method, amount, merchantCode, invoiceNumber }, "Calling Tripay API");

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
            name: `Topup Kredit Mution — ${amount.toLocaleString("id-ID")} Credits`,
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
    logger.info({ tripayData }, "Tripay API response");

    if (!tripayData.success) {
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

  await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, order.userId))
      .limit(1);

    const newCredits = user.credits + order.creditsAmount;
    const newPlan = computePlan(newCredits);

    await tx
      .update(usersTable)
      .set({ credits: newCredits, plan: newPlan })
      .where(eq(usersTable.id, order.userId));

    await tx
      .update(paymentOrdersTable)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(paymentOrdersTable.id, order.id));

    await tx.insert(creditTransactionsTable).values({
      userId: order.userId,
      type: "topup",
      amount: order.creditsAmount,
      note: `Topup via Tripay (${payload.payment_name}) — ${order.invoiceNumber}`,
    });
  });

  res.json({ success: true });
});

export default router;
