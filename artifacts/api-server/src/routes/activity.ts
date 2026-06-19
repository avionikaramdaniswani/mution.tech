import { Router } from "express";
import { db, activityLogsTable, projectsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

router.get("/activity", async (req, res): Promise<void> => {
  const user = (req as any).user;

  const logs = await db
    .select({
      id: activityLogsTable.id,
      userId: activityLogsTable.userId,
      projectId: activityLogsTable.projectId,
      action: activityLogsTable.action,
      metadata: activityLogsTable.metadata,
      createdAt: activityLogsTable.createdAt,
      projectName: projectsTable.name,
    })
    .from(activityLogsTable)
    .leftJoin(projectsTable, eq(activityLogsTable.projectId, projectsTable.id))
    .where(eq(activityLogsTable.userId, user.id))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(50);

  res.json(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      projectId: l.projectId ?? null,
      projectName: l.projectName ?? null,
      action: l.action,
      metadata: l.metadata ?? null,
      createdAt: l.createdAt.toISOString(),
    }))
  );
});

export default router;
