import { Router } from "express";
import crypto from "crypto";
import { db, usersTable, paymentOrdersTable, creditTransactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { createDokuPayment, verifyDokuNotifySignature, getDokuConfig } from "../lib/doku";
import { computePlan } from "../lib/plan";
import { logActivity } from "../lib/activity";
import { z } from "zod";

const router = Router();

const CreatePaymentBody = z.object({
  amount: z.number().int().min(1000),
});

function getBaseUrl(req: import("express").Request): string {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) return `https://${replitDomain}`;
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:5000";
  return `${proto}://${host}`;
}

// POST /billing/payment/create — create a DOKU checkout order
router.post("/billing/payment/create", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nominal minimal Rp 1.000" });
    return;
  }

  const user = (req as any).user;
  const { amount } = parsed.data;

  try {
    getDokuConfig();
  } catch {
    res.status(503).json({ error: "Payment gateway belum dikonfigurasi. Hubungi administrator." });
    return;
  }

  const invoiceNumber = `INV-${Date.now()}-${user.id}`;
  const baseUrl = getBaseUrl(req);
  const successUrl = `${baseUrl}/billing/payment/success?invoice=${invoiceNumber}`;

  try {
    const { paymentUrl } = await createDokuPayment({
      invoiceNumber,
      amount,
      user: { id: user.id, name: user.name, email: user.email },
      successUrl,
    });

    await db.insert(paymentOrdersTable).values({
      userId: user.id,
      invoiceNumber,
      amount,
      status: "pending",
      paymentUrl,
    });

    await logActivity(user.id, "billing.payment.created", undefined, { invoiceNumber, amount });

    res.status(201).json({ paymentUrl, invoiceNumber });
  } catch (err: any) {
    console.error("DOKU create payment error:", err?.message);
    res.status(503).json({ error: "Gagal membuat payment. Coba lagi." });
  }
});

// POST /billing/payment/notify — DOKU webhook (no auth, verify by signature)
router.post("/billing/payment/notify", async (req, res): Promise<void> => {
  let secretKey: string;
  try {
    ({ secretKey } = getDokuConfig());
  } catch {
    res.status(200).json({ success: true });
    return;
  }

  const headers = {
    "client-id": req.headers["client-id"] as string,
    "request-id": req.headers["request-id"] as string,
    "request-timestamp": req.headers["request-timestamp"] as string,
    signature: req.headers["signature"] as string,
  };

  const isValid = verifyDokuNotifySignature(secretKey, headers, req.body);
  if (!isValid) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const invoiceNumber: string = req.body?.order?.invoice_number ?? "";
  const transactionStatus: string = req.body?.transaction?.status ?? "";

  if (!invoiceNumber) {
    res.status(200).json({ success: true });
    return;
  }

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(and(eq(paymentOrdersTable.invoiceNumber, invoiceNumber), eq(paymentOrdersTable.status, "pending")));

  if (!order) {
    res.status(200).json({ success: true });
    return;
  }

  if (transactionStatus === "SUCCESS") {
    const newStatus = "paid";
    await db
      .update(paymentOrdersTable)
      .set({ status: newStatus, paidAt: new Date() })
      .where(eq(paymentOrdersTable.id, order.id));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId));
    if (user) {
      const newCredits = user.credits + order.amount;
      const newPlan = computePlan(newCredits);
      await db
        .update(usersTable)
        .set({ credits: newCredits, plan: newPlan })
        .where(eq(usersTable.id, user.id));

      await db.insert(creditTransactionsTable).values({
        userId: user.id,
        type: "topup",
        amount: order.amount,
        note: `Topup via DOKU · ${invoiceNumber}`,
      });

      await logActivity(user.id, "billing.payment.paid", undefined, { invoiceNumber, amount: order.amount });
    }
  } else if (["FAILED", "EXPIRED"].includes(transactionStatus)) {
    const newStatus = transactionStatus === "EXPIRED" ? "expired" : "failed";
    await db
      .update(paymentOrdersTable)
      .set({ status: newStatus as "expired" | "failed" })
      .where(eq(paymentOrdersTable.id, order.id));
  }

  res.status(200).json({ success: true });
});

// GET /billing/payment/:invoiceNumber — poll status (for success page)
router.get("/billing/payment/:invoiceNumber", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { invoiceNumber } = req.params;

  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(and(eq(paymentOrdersTable.invoiceNumber, invoiceNumber), eq(paymentOrdersTable.userId, user.id)));

  if (!order) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json({
    invoiceNumber: order.invoiceNumber,
    amount: order.amount,
    status: order.status,
    paymentUrl: order.paymentUrl ?? null,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
  });
});

export default router;
