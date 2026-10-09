import { Router } from "express";
import { db, announcementsTable, announcementReactionsTable } from "@workspace/db";
import { eq, desc, or, isNull, gt, and, inArray } from "drizzle-orm";
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
    
    if (activeItems.length === 0) {
      return res.json([]);
    }

    const activeIds = activeItems.map(a => a.id);
    const userId = (req as any).user.id;

    // Fetch all reactions for these announcements
    const allReactions = await db.select()
      .from(announcementReactionsTable)
      .where(inArray(announcementReactionsTable.announcementId, activeIds));

    // Map reactions to the respective announcements
    const result = activeItems.map(item => {
      const itemReactions = allReactions.filter(r => r.announcementId === item.id);
      
      const reactionsCount: Record<string, number> = {};
      const userReactions: string[] = [];

      for (const r of itemReactions) {
        reactionsCount[r.emoji] = (reactionsCount[r.emoji] || 0) + 1;
        if (r.userId === userId) {
          userReactions.push(r.emoji);
        }
      }

      return {
        ...item,
        reactions: reactionsCount,
        userReactions,
      };
    });

    return res.json(result);
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
    const { title, content, type, isActive, expiresAt, ctaText, ctaLink } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const [item] = await db.insert(announcementsTable).values({
      title,
      content,
      type: type || "info",
      ctaText: ctaText || null,
      ctaLink: ctaLink || null,
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
    const { title, content, type, isActive, expiresAt, ctaText, ctaLink } = req.body;

    const [item] = await db.update(announcementsTable)
      .set({
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(ctaText !== undefined && { ctaText: ctaText || null }),
        ...(ctaLink !== undefined && { ctaLink: ctaLink || null }),
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

// POST /announcements/:id/react
router.post("/announcements/:id/react", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { emoji } = req.body;
    const userId = (req as any).user.id;

    if (!emoji || typeof emoji !== "string") {
      return res.status(400).json({ error: "Emoji is required" });
    }

    // Check if announcement exists
    const [announcement] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    // Check if reaction already exists
    const [existing] = await db.select()
      .from(announcementReactionsTable)
      .where(and(
        eq(announcementReactionsTable.announcementId, id),
        eq(announcementReactionsTable.userId, userId),
        eq(announcementReactionsTable.emoji, emoji)
      ));

    if (existing) {
      // Toggle off
      await db.delete(announcementReactionsTable).where(eq(announcementReactionsTable.id, existing.id));
      return res.json({ action: "removed", emoji });
    } else {
      // Toggle on
      await db.insert(announcementReactionsTable).values({
        announcementId: id,
        userId: userId,
        emoji,
      });
      return res.json({ action: "added", emoji });
    }
  } catch (error) {
    console.error("Failed to react to announcement:", error);
    return res.status(500).json({ error: "Failed to process reaction" });
  }
});

export default router;
