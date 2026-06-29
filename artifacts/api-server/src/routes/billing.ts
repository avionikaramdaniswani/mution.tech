import { Router } from "express";
import { db, usersTable, creditTransactionsTable, paymentOrdersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { TopupCreditsBody } from "@workspace/api-zod";
import { computePlan } from "../lib/plan";
import {
  getTripayBase,
  createOrderSignature,
  verifyCallbackSignature,
  CREDIT_PACKAGES,
  type TripayCreateResponse,
  type TripayCallbackPayload,
} from "../lib/tripay";

const router = Router();

router.get("/billing/packages", (_req, res): void => {
  res.json(CREDIT_PACKAGES);
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

router.get("/billing/orders", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const orders = await db
    .select()
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.userId, user.id))
    .orderBy(desc(paymentOrdersTable.createdAt))
    .limit(20);

  res.json(
    orders.map((o) => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      amount: o.amount,
      creditsAmount: o.creditsAmount,
      status: o.status,
      paymentUrl: o.paymentUrl,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
    }))
  );
});

router.post("/billing/tripay/create", requireAuth, async (req, res): Promise<void> => {
  const apiKey = process.env.TRIPAY_API_KEY;
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  const merchantCode = process.env.TRIPAY_MERCHANT_CODE;

  if (!apiKey || !privateKey || !merchantCode) {
    res.status(503).json({ error: "Tripay belum dikonfigurasi" });
    return;
  }

  const { packageId, method = "QRIS" } = req.body as { packageId: string; method?: string };
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    res.status(400).json({ error: "Paket tidak valid" });
    return;
  }

  const user = (req as any).user;
  const invoiceNumber = `MUTION-${Date.now()}-${user.id}`;
  const signature = createOrderSignature(merchantCode, invoiceNumber, pkg.idr, privateKey);

  const [order] = await db
    .insert(paymentOrdersTable)
    .values({
      userId: user.id,
      invoiceNumber,
      amount: pkg.idr,
      creditsAmount: pkg.credits,
      provider: "tripay",
      status: "pending",
    })
    .returning();

  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  try {
    const tripayRes = await fetch(`${getTripayBase()}/transaction/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method,
        merchant_ref: invoiceNumber,
        amount: pkg.idr,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: "08123456789",
        order_items: [
          {
            name: `${pkg.label} Package — ${pkg.credits.toLocaleString("id-ID")} Credits`,
            price: pkg.idr,
            quantity: 1,
          },
        ],
        return_url: "https://mution.tech/dashboard/billing",
        expired_time: expiredTime,
        signature,
      }),
    });

    const tripayData = (await tripayRes.json()) as TripayCreateResponse;

    if (!tripayData.success) {
      await db
        .update(paymentOrdersTable)
        .set({ status: "failed" })
        .where(eq(paymentOrdersTable.id, order.id));
      res.status(502).json({ error: tripayData.message ?? "Gagal membuat transaksi Tripay" });
      return;
    }

    const paymentUrl = tripayData.data.checkout_url ?? tripayData.data.payment_url;
    await db
      .update(paymentOrdersTable)
      .set({ paymentUrl })
      .where(eq(paymentOrdersTable.id, order.id));

    res.json({
      orderId: order.id,
      invoiceNumber,
      paymentUrl,
      amount: pkg.idr,
      credits: pkg.credits,
    });
  } catch {
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

  const rawBody = (req.body as Buffer).toString("utf-8");
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
