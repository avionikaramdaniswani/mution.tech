import { Router } from "express";
import { db, creditPackagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

// Public endpoint — daftar paket kredit yang aktif
router.get("/packages", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(creditPackagesTable)
      .where(eq(creditPackagesTable.isActive, true))
      .orderBy(asc(creditPackagesTable.sortOrder), asc(creditPackagesTable.id));
    res.json(rows);
  } catch {
    res.json([]);
  }
});

export default router;
