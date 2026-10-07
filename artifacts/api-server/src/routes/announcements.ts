import { Router } from "express";
import { db, announcementsTable } from "@workspace/db";
import { eq, desc, or, isNull, gt } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// GET /announcements - For users (active announcements only, not expired)
router.get("/announcements", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const items = await db.select()
      .from(announcementsTable)
      .where(
        or(
          isNull(announcementsTable.expiresAt),
          gt(announcementsTable.expiresAt, now)
        )
      )
      .orderBy(desc(announcementsTable.createdAt));
      
    // Filter active ones manually or via query. 
    // Doing it manually here to ensure we only send active ones.
    const activeItems = items.filter(item => item.isActive);
    
    return res.json(activeItems);
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// GET /admin/announcements - For admins (all announcements)
router.get("/admin/announcements", requireAdmin, async (req, res) => {
  try {
    const items = await db.select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.createdAt));
    return res.json(items);
  } catch (error) {
    console.error("Failed to fetch admin announcements:", error);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// POST /admin/announcements
router.post("/admin/announcements", requireAdmin, async (req, res) => {
  try {
    const { title, content, type, isActive, expiresAt } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const [item] = await db.insert(announcementsTable).values({
      title,
      content,
      type: type || "info",
      isActive: isActive !== undefined ? isActive : true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      updatedAt: new Date(),
    }).returning();

    return res.json(item);
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return res.status(500).json({ error: "Failed to create announcement" });
  }
});

// PATCH /admin/announcements/:id
router.patch("/admin/announcements/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { title, content, type, isActive, expiresAt } = req.body;

    const [item] = await db.update(announcementsTable)
      .set({
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        updatedAt: new Date(),
      })
      .where(eq(announcementsTable.id, id))
      .returning();

    if (!item) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    return res.json(item);
  } catch (error) {
    console.error("Failed to update announcement:", error);
    return res.status(500).json({ error: "Failed to update announcement" });
  }
});

// DELETE /admin/announcements/:id
router.delete("/admin/announcements/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    
    const [deleted] = await db.delete(announcementsTable)
      .where(eq(announcementsTable.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    return res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;
