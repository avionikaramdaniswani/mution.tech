import { Router } from "express";
import { db } from "@workspace/db";
import { changelogsTable, insertChangelogSchema } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

function parseRouteId(param: string | string[]): number {
  const raw = Array.isArray(param) ? param[0] : param;
  return parseInt(raw, 10);
}

// Public route to get all changelogs
router.get("/changelog", async (req, res) => {
  try {
    const changelogs = await db
      .select()
      .from(changelogsTable)
      .orderBy(desc(changelogsTable.createdAt));
    res.json(changelogs);
  } catch (error) {
    console.error("Error fetching changelogs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin routes
router.post("/admin/changelog", requireAdmin, async (req, res) => {
  try {
    const data = insertChangelogSchema.parse(req.body);
    const [inserted] = await db.insert(changelogsTable).values(data).returning();
    res.json(inserted);
  } catch (error) {
    console.error("Error creating changelog:", error);
    res.status(400).json({ error: "Invalid data or internal error" });
  }
});

router.put("/admin/changelog/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    const data = insertChangelogSchema.partial().parse(req.body);
    
    // Ensure changes array is well-formed if it exists
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    const [updated] = await db
      .update(changelogsTable)
      .set(updateData)
      .where(eq(changelogsTable.id, id))
      .returning();
      
    if (!updated) {
      res.status(404).json({ error: "Changelog not found" });
      return;
    }
    res.json(updated);
    return;
  } catch (error) {
    console.error("Error updating changelog:", error);
    res.status(400).json({ error: "Invalid data or internal error" });
    return;
  }
});

router.delete("/admin/changelog/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    const [deleted] = await db
      .delete(changelogsTable)
      .where(eq(changelogsTable.id, id))
      .returning();
      
    if (!deleted) {
      res.status(404).json({ error: "Changelog not found" });
      return;
    }
    res.json(deleted);
    return;
  } catch (error) {
    console.error("Error deleting changelog:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
