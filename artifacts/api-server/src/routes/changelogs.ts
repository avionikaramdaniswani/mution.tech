import { Router } from "express";
import { db } from "@workspace/db";
import { changelogsTable, insertChangelogSchema, type ChangelogChange } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

function parseRouteId(param: string | string[]): number {
  const raw = Array.isArray(param) ? param[0] : param;
  return parseInt(raw, 10);
}

type LegacyChange = {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  text?: unknown;
};

function normalizeChange(change: LegacyChange): ChangelogChange {
  const title = typeof change.title === "string" ? change.title : typeof change.text === "string" ? change.text : "";
  const description = typeof change.description === "string" ? change.description : undefined;

  return {
    type: change.type === "fix" || change.type === "chore" || change.type === "feat" ? change.type : "chore",
    title,
    description,
  };
}

function normalizeChanges(changes: unknown): ChangelogChange[] {
  if (!Array.isArray(changes)) return [];
  return changes.map((change) => normalizeChange((change ?? {}) as LegacyChange));
}

function normalizeChangelogPayload<T extends Record<string, unknown>>(payload: T): T {
  if (!("changes" in payload)) return payload;
  return {
    ...payload,
    changes: normalizeChanges(payload.changes),
  };
}

function normalizeChangelogRecord<T extends { changes: unknown }>(record: T) {
  return {
    ...record,
    changes: normalizeChanges(record.changes),
  };
}

// Public route to get all changelogs
router.get("/changelog", async (req, res) => {
  try {
    const changelogs = await db
      .select()
      .from(changelogsTable)
      .orderBy(desc(changelogsTable.createdAt));
    res.json(changelogs.map(normalizeChangelogRecord));
  } catch (error) {
    console.error("Error fetching changelogs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin routes
router.post("/admin/changelog", requireAdmin, async (req, res) => {
  try {
    const data = insertChangelogSchema.parse(normalizeChangelogPayload(req.body));
    const [inserted] = await db.insert(changelogsTable).values(data).returning();
    res.json(normalizeChangelogRecord(inserted));
  } catch (error) {
    console.error("Error creating changelog:", error);
    res.status(400).json({ error: "Invalid data or internal error" });
  }
});

router.put("/admin/changelog/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    const data = insertChangelogSchema.partial().parse(normalizeChangelogPayload(req.body));
    
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
    res.json(normalizeChangelogRecord(updated));
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
