import { Router } from "express";
import { db, usersTable, projectsTable, deploymentsTable, paymentOrdersTable, creditTransactionsTable, apiUsageTable, creditPackagesTable } from "@workspace/db";
import { eq, desc, sql, count, and, gte, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { logActivity } from "../lib/activity";
import { computePlan } from "../lib/plan";
import { addAdminClient, removeAdminClient, broadcastAdmin, broadcastToUser, addUserClient, removeUserClient } from "../lib/events";
import { adminGetProviderStatuses, adminEnableProvider, adminDisableProvider, adminGetModelPricingOverrides, adminSetModelPricingOverride, adminDeleteModelPricingOverride } from "./v1-proxy";
import { MODEL_CATALOG } from "@workspace/model-catalog";

const router = Router();

router.use(requireAdmin);

// ─── Server-Sent Events stream untuk admin ────────────────────────────────────
router.get("/admin/events", (req, res): void => {
  const admin = (req as any).user;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  // Daftarkan sebagai koneksi admin (menerima event admin) sekaligus koneksi
  // user (menerima perubahan saldo admin itu sendiri) lewat satu koneksi.
  addAdminClient(res);
  addUserClient(admin.id, res);

  // Kirim heartbeat tiap 30 detik biar koneksi tetap hidup (beberapa proxy timeout kalau diam)
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      removeAdminClient(res);
      removeUserClient(admin.id, res);
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeAdminClient(res);
    removeUserClient(admin.id, res);
  });
});

function formatUser(u: {
  id: number;
  email: string;
  name: string;
  role: string;
  plan: string;
  credits: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  projectCount: number;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    plan: u.plan,
    credits: u.credits,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    projectCount: u.projectCount,
  };
}

const userSelectFields = {
  id: usersTable.id,
  email: usersTable.email,
  name: usersTable.name,
  role: usersTable.role,
  plan: usersTable.plan,
  credits: usersTable.credits,
  createdAt: usersTable.createdAt,
  lastLoginAt: usersTable.lastLoginAt,
  projectCount: sql<number>`count(${projectsTable.id})::int`,
};

// List all users with project count
router.get("/admin/users", async (req, res): Promise<void> => {
  const users = await db
    .select(userSelectFields)
    .from(usersTable)
    .leftJoin(projectsTable, eq(projectsTable.userId, usersTable.id))
    .groupBy(usersTable.id)
    .orderBy(desc(usersTable.createdAt));

  res.json(users.map((u) => formatUser({ ...u, projectCount: u.projectCount ?? 0 })));
});

// Get single user detail
router.get("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select(userSelectFields)
    .from(usersTable)
    .leftJoin(projectsTable, eq(projectsTable.userId, usersTable.id))
    .groupBy(usersTable.id)
    .where(eq(usersTable.id, id));

  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser({ ...row, projectCount: row.projectCount ?? 0 }));
});

// Delete a user
router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (id === admin.id) { res.status(400).json({ error: "Cannot delete your own account" }); return; }

  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }

  await logActivity(admin.id, "admin.user.deleted", undefined, { targetEmail: deleted.email });
  res.json({ success: true });
});

// List all projects with owner info
router.get("/admin/projects", async (req, res): Promise<void> => {
  const projects = await db
    .select({
      id: projectsTable.id,
      userId: projectsTable.userId,
      name: projectsTable.name,
      repoUrl: projectsTable.repoUrl,
      runtime: projectsTable.runtime,
      status: projectsTable.status,
      domain: projectsTable.domain,
      createdAt: projectsTable.createdAt,
      lastDeployedAt: projectsTable.lastDeployedAt,
      ownerEmail: usersTable.email,
      ownerName: usersTable.name,
    })
    .from(projectsTable)
    .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
    .orderBy(desc(projectsTable.createdAt));

  res.json(
    projects.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      repoUrl: p.repoUrl ?? null,
      runtime: p.runtime,
      status: p.status,
      domain: p.domain ?? null,
      createdAt: p.createdAt.toISOString(),
      lastDeployedAt: p.lastDeployedAt?.toISOString() ?? null,
      ownerEmail: p.ownerEmail,
      ownerName: p.ownerName,
    }))
  );
});

// Admin stop any project
router.post("/admin/projects/:id/stop", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .update(projectsTable)
    .set({ status: "stopped" })
    .where(eq(projectsTable.id, id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(admin.id, "admin.project.stopped", id, { projectName: project.name });

  res.json({
    id: project.id,
    userId: project.userId,
    name: project.name,
    repoUrl: project.repoUrl ?? null,
    runtime: project.runtime,
    status: project.status,
    domain: project.domain ?? null,
    createdAt: project.createdAt.toISOString(),
    lastDeployedAt: project.lastDeployedAt?.toISOString() ?? null,
  });
});

// Admin delete any project
router.delete("/admin/projects/:id", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(admin.id, "admin.project.deleted", undefined, { projectName: project.name });
  res.json({ success: true });
});

// Admin platform stats
router.get("/admin/stats", async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [projectCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable);
  const [deploymentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(deploymentsTable);

  const projects = await db.select({ status: projectsTable.status }).from(projectsTable);
  const runningProjects = projects.filter((p) => p.status === "running").length;
  const failedProjects = projects.filter((p) => p.status === "failed").length;

  res.json({
    totalUsers: userCount?.count ?? 0,
    totalProjects: projectCount?.count ?? 0,
    totalDeployments: deploymentCount?.count ?? 0,
    runningProjects,
    failedProjects,
  });
});

// ─── User management: role & credits ──────────────────────────────────────────

// Re-query a user together with its project count (UserWithStats shape).
async function fetchUserWithStats(id: number) {
  const [row] = await db
    .select(userSelectFields)
    .from(usersTable)
    .leftJoin(projectsTable, eq(projectsTable.userId, usersTable.id))
    .groupBy(usersTable.id)
    .where(eq(usersTable.id, id));
  if (!row) return null;
  return formatUser({ ...row, projectCount: row.projectCount ?? 0 });
}

// Update a user's role and/or plan
router.patch("/admin/users/:id/role", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { role, plan } = (req.body ?? {}) as { role?: string; plan?: string };
  const updates: Partial<{ role: "user" | "admin"; plan: "hobby" | "pro" | "team" }> = {};

  if (role !== undefined) {
    if (role !== "user" && role !== "admin") { res.status(400).json({ error: "Role tidak valid" }); return; }
    if (id === admin.id && role !== "admin") { res.status(400).json({ error: "Tidak bisa mencabut akses admin dari akun sendiri" }); return; }
    updates.role = role;
  }
  if (plan !== undefined) {
    if (plan !== "hobby" && plan !== "pro" && plan !== "team") { res.status(400).json({ error: "Plan tidak valid" }); return; }
    updates.plan = plan;
  }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Tidak ada perubahan" }); return; }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  await logActivity(admin.id, "admin.user.updated", undefined, { targetEmail: updated.email, ...updates });

  const result = await fetchUserWithStats(id);
  broadcastAdmin({ type: "user.updated", userId: id });
  broadcastToUser(id, { type: "profile.updated" });
  res.json(result);
});

// Manually adjust a user's credit balance (positive = tambah, negative = kurang)
router.post("/admin/users/:id/credits", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { amount, note } = (req.body ?? {}) as { amount?: unknown; note?: unknown };
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount === 0) {
    res.status(400).json({ error: "Nominal penyesuaian harus bilangan bulat selain nol" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const newCredits = target.credits + amount;
  if (newCredits < 0) {
    res.status(400).json({ error: "Saldo hasil penyesuaian tidak boleh negatif" });
    return;
  }
  const newPlan = computePlan(newCredits);
  const cleanNote = typeof note === "string" && note.trim().length > 0
    ? note.trim()
    : `Penyesuaian admin ${amount > 0 ? "+" : ""}${amount.toLocaleString("id-ID")}`;

  await db.transaction(async (tx) => {
    await tx.update(usersTable).set({ credits: newCredits, plan: newPlan }).where(eq(usersTable.id, id));
    await tx.insert(creditTransactionsTable).values({
      userId: id,
      type: "plan_credit",
      amount,
      note: cleanNote,
    });
  });

  await logActivity(admin.id, "admin.user.credits_adjusted", undefined, { targetEmail: target.email, amount });

  const result = await fetchUserWithStats(id);
  broadcastAdmin({ type: "user.credits_adjusted", userId: id, amount });
  broadcastToUser(id, { type: "credits.changed", amount });
  res.json(result);
});

// ─── Payments / revenue ───────────────────────────────────────────────────────

// List all payment orders across users
router.get("/admin/orders", async (_req, res): Promise<void> => {
  const orders = await db
    .select({
      id: paymentOrdersTable.id,
      userId: paymentOrdersTable.userId,
      invoiceNumber: paymentOrdersTable.invoiceNumber,
      amount: paymentOrdersTable.amount,
      creditsAmount: paymentOrdersTable.creditsAmount,
      provider: paymentOrdersTable.provider,
      status: paymentOrdersTable.status,
      createdAt: paymentOrdersTable.createdAt,
      paidAt: paymentOrdersTable.paidAt,
      ownerEmail: usersTable.email,
      ownerName: usersTable.name,
    })
    .from(paymentOrdersTable)
    .innerJoin(usersTable, eq(paymentOrdersTable.userId, usersTable.id))
    .orderBy(desc(paymentOrdersTable.createdAt))
    .limit(200);

  res.json(
    orders.map((o) => ({
      id: o.id,
      userId: o.userId,
      invoiceNumber: o.invoiceNumber,
      amount: o.amount,
      creditsAmount: o.creditsAmount,
      provider: o.provider,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      ownerEmail: o.ownerEmail,
      ownerName: o.ownerName,
    }))
  );
});

// Revenue summary
router.get("/admin/revenue", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumAmount = sql<number>`coalesce(sum(${paymentOrdersTable.amount}), 0)::int`;

  const [total] = await db
    .select({ total: sumAmount })
    .from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.status, "paid"));

  const [today] = await db
    .select({ total: sumAmount })
    .from(paymentOrdersTable)
    .where(and(eq(paymentOrdersTable.status, "paid"), gte(paymentOrdersTable.paidAt, startOfDay)));

  const [month] = await db
    .select({ total: sumAmount })
    .from(paymentOrdersTable)
    .where(and(eq(paymentOrdersTable.status, "paid"), gte(paymentOrdersTable.paidAt, startOfMonth)));

  const statusRows = await db
    .select({ status: paymentOrdersTable.status, c: sql<number>`count(*)::int` })
    .from(paymentOrdersTable)
    .groupBy(paymentOrdersTable.status);

  let paidCount = 0, pendingCount = 0, failedCount = 0;
  for (const row of statusRows) {
    if (row.status === "paid") paidCount += row.c;
    else if (row.status === "pending") pendingCount += row.c;
    else failedCount += row.c; // failed | expired | cancelled
  }

  res.json({
    totalRevenue: total?.total ?? 0,
    todayRevenue: today?.total ?? 0,
    monthRevenue: month?.total ?? 0,
    paidCount,
    pendingCount,
    failedCount,
  });
});

// ─── AI usage analytics ───────────────────────────────────────────────────────

// Ringkasan pemakaian AI-proxy: total, breakdown per model, top user, tren harian.
// Query param `days` (1–365, default 30) membatasi rentang waktu.
router.get("/admin/usage", async (req, res): Promise<void> => {
  const daysRaw = parseInt(String(req.query.days ?? "30"), 10);
  const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, daysRaw)) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const totalTokens = sql<number>`coalesce(sum(${apiUsageTable.totalTokens}), 0)::bigint`;
  const promptTokens = sql<number>`coalesce(sum(${apiUsageTable.promptTokens}), 0)::bigint`;
  const completionTokens = sql<number>`coalesce(sum(${apiUsageTable.completionTokens}), 0)::bigint`;
  const totalCredits = sql<number>`coalesce(sum(${apiUsageTable.credits}), 0)::bigint`;
  const requestCount = sql<number>`count(*)::int`;

  const inRange = gte(apiUsageTable.createdAt, since);

  // Total keseluruhan dalam rentang.
  const [totals] = await db
    .select({
      requests: requestCount,
      totalTokens,
      promptTokens,
      completionTokens,
      credits: totalCredits,
    })
    .from(apiUsageTable)
    .where(inRange);

  // Breakdown per model.
  const byModel = await db
    .select({
      model: apiUsageTable.model,
      requests: requestCount,
      totalTokens,
      credits: totalCredits,
    })
    .from(apiUsageTable)
    .where(inRange)
    .groupBy(apiUsageTable.model)
    .orderBy(desc(totalTokens));

  // Top user berdasarkan token.
  const byUser = await db
    .select({
      userId: apiUsageTable.userId,
      email: usersTable.email,
      name: usersTable.name,
      requests: requestCount,
      totalTokens,
      credits: totalCredits,
    })
    .from(apiUsageTable)
    .innerJoin(usersTable, eq(apiUsageTable.userId, usersTable.id))
    .where(inRange)
    .groupBy(apiUsageTable.userId, usersTable.email, usersTable.name)
    .orderBy(desc(totalTokens))
    .limit(20);

  // Tren harian.
  const dayCol = sql<string>`to_char(date_trunc('day', ${apiUsageTable.createdAt}), 'YYYY-MM-DD')`;
  const daily = await db
    .select({
      day: dayCol,
      requests: requestCount,
      totalTokens,
      credits: totalCredits,
    })
    .from(apiUsageTable)
    .where(inRange)
    .groupBy(dayCol)
    .orderBy(dayCol);

  res.json({
    rangeDays: days,
    since: since.toISOString(),
    totals: {
      requests: Number(totals?.requests ?? 0),
      totalTokens: Number(totals?.totalTokens ?? 0),
      promptTokens: Number(totals?.promptTokens ?? 0),
      completionTokens: Number(totals?.completionTokens ?? 0),
      credits: Number(totals?.credits ?? 0),
    },
    byModel: byModel.map((m) => ({
      model: m.model,
      requests: Number(m.requests),
      totalTokens: Number(m.totalTokens),
      credits: Number(m.credits),
    })),
    topUsers: byUser.map((u) => ({
      userId: u.userId,
      email: u.email,
      name: u.name,
      requests: Number(u.requests),
      totalTokens: Number(u.totalTokens),
      credits: Number(u.credits),
    })),
    daily: daily.map((d) => ({
      day: d.day,
      requests: Number(d.requests),
      totalTokens: Number(d.totalTokens),
      credits: Number(d.credits),
    })),
  });
});

// ─── Provider management ──────────────────────────────────────────────────────
router.get("/admin/providers", async (_req, res): Promise<void> => {
  try {
    res.json(await adminGetProviderStatuses());
  } catch (error) {
    console.error("Failed to fetch provider statuses:", error);
    res.status(500).json({ error: "Gagal mengambil data provider" });
  }
});

router.patch("/admin/providers/:id/toggle", async (req, res): Promise<void> => {
  const id = decodeURIComponent(req.params.id);
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be boolean" });
    return;
  }
  try {
    if (enabled) await adminEnableProvider(id);
    else await adminDisableProvider(id);
    res.json({ ok: true, id, enabled });
  } catch (error) {
    console.error("Failed to update provider status:", error);
    res.status(500).json({ error: "Gagal mengubah status provider" });
  }
});

router.post("/admin/providers/:id/reset-cooldown", (req, res) => {
  // Just return ok — cooldown resets naturally; this endpoint is for UI feedback
  const id = decodeURIComponent(req.params.id);
  res.json({ ok: true, id, message: "Cooldown will expire naturally or on next restart" });
});

// ─── Model Pricing Overrides ──────────────────────────────────────────────────

router.get("/admin/model-pricing", async (_req, res) => {
  try {
    const overrides = await adminGetModelPricingOverrides();
    const overrideMap = new Map(overrides.map((o) => [o.modelId, o]));

    const result = MODEL_CATALOG.map((m) => {
      const ov = overrideMap.get(m.id);
      return {
        modelId: m.id,
        label: m.label,
        provider: m.provider,
        basePricingInput: m.pricing.input,
        basePricingOutput: m.pricing.output,
        context: m.context,
        override: ov
          ? {
              mode: ov.mode,
              discountPercent: ov.discountPercent,
              inputPriceOverride: ov.inputPriceOverride,
              outputPriceOverride: ov.outputPriceOverride,
              updatedAt: ov.updatedAt.toISOString(),
            }
          : null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch model pricing:", error);
    res.status(500).json({ error: "Gagal mengambil data harga model" });
  }
});

router.patch("/admin/model-pricing/:modelId", async (req, res) => {
  try {
    const modelId = decodeURIComponent(req.params.modelId);
    const { mode, discountPercent, inputPriceOverride, outputPriceOverride } = req.body;

    const validModes = ["default", "discount_percent", "fixed_price", "free"];
    if (!validModes.includes(mode)) {
      res.status(400).json({ error: "Mode tidak valid" });
      return;
    }

    const admin = (req as any).user;
    await adminSetModelPricingOverride(
      modelId,
      { mode, discountPercent: discountPercent ?? null, inputPriceOverride: inputPriceOverride ?? null, outputPriceOverride: outputPriceOverride ?? null },
      admin.id,
    );
    res.json({ ok: true, modelId, mode });
  } catch (error) {
    console.error("Failed to update model pricing:", error);
    res.status(500).json({ error: "Gagal mengubah harga model" });
  }
});

router.delete("/admin/model-pricing/:modelId", async (req, res) => {
  try {
    const modelId = decodeURIComponent(req.params.modelId);
    await adminDeleteModelPricingOverride(modelId);
    res.json({ ok: true, modelId });
  } catch (error) {
    console.error("Failed to reset model pricing:", error);
    res.status(500).json({ error: "Gagal mereset harga model" });
  }
});

// ─── Credit Packages CRUD ─────────────────────────────────────────────────────

import { z as _z } from "zod";

const PackageBody = _z.object({
  name: _z.string().trim().min(1).max(80),
  description: _z.string().trim().max(200).optional(),
  priceIdr: _z.number().int().min(1000),
  creditsAmount: _z.number().int().min(1),
  bonusLabel: _z.string().trim().max(40).optional(),
  isActive: _z.boolean().optional(),
  sortOrder: _z.number().int().optional(),
});

router.get("/admin/packages", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(creditPackagesTable)
    .orderBy(asc(creditPackagesTable.sortOrder), asc(creditPackagesTable.id));
  res.json(rows);
});

router.post("/admin/packages", async (req, res): Promise<void> => {
  const parsed = PackageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Data tidak valid" }); return; }
  const [row] = await db.insert(creditPackagesTable).values({
    ...parsed.data,
    updatedAt: new Date(),
  }).returning();
  res.json(row);
});

router.patch("/admin/packages/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }
  const parsed = PackageBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Data tidak valid" }); return; }
  const [row] = await db
    .update(creditPackagesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(creditPackagesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Paket tidak ditemukan" }); return; }
  res.json(row);
});

router.delete("/admin/packages/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }
  await db.delete(creditPackagesTable).where(eq(creditPackagesTable.id, id));
  res.json({ ok: true });
});

export default router;
