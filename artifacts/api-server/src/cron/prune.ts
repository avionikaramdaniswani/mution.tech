import { db, apiRequestsTable } from "@workspace/db";
import { lt } from "drizzle-orm";
import { logger } from "../lib/logger";

const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function startAutoPruneCron() {
  logger.info("Starting auto-prune cron job for API requests...");
  
  setInterval(async () => {
    try {
      // Calculate date 14 days ago
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);

      const result = await db.delete(apiRequestsTable)
        .where(lt(apiRequestsTable.createdAt, cutoffDate))
        .returning({ id: apiRequestsTable.id });
        
      if (result.length > 0) {
        logger.info({ prunedCount: result.length }, `Auto-pruned ${result.length} API requests older than 14 days.`);
      }
    } catch (err) {
      logger.error({ err }, "Error in auto-prune cron job");
    }
  }, PRUNE_INTERVAL_MS);
}
