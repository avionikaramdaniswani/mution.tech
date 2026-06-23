import { Router } from "express";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { TopupCreditsBody } from "@workspace/api-zod";
import { computePlan } from "../lib/plan";

const router = Router();

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

export default router;
