import { db, activityLogsTable } from "@workspace/db";
import { logger } from "./logger";

export async function logActivity(
  userId: number,
  action: string,
  projectId?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(activityLogsTable).values({
      userId,
      projectId: projectId ?? null,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to log activity");
  }
}
