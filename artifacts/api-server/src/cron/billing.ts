import { db, projectsTable, usersTable, creditTransactionsTable, TIER_PRICING } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { stopProjectWithCoolify, isCoolifyConfigured } from "../lib/coolify";

const BILLING_INTERVAL_MS = 60 * 1000; // 1 minute

export function startBillingCron() {
  logger.info("Starting uptime billing cron job...");
  
  setInterval(async () => {
    try {
      const runningProjects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.status, "running"));

      if (runningProjects.length === 0) return;

      const projectsByUser = new Map<number, typeof runningProjects>();
      for (const p of runningProjects) {
        const list = projectsByUser.get(p.userId) || [];
        list.push(p);
        projectsByUser.set(p.userId, list);
      }

      for (const [userId, projects] of projectsByUser.entries()) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (!user) continue;

        let totalCost = 0;
        for (const p of projects) {
            const tier = TIER_PRICING[p.ramTier];
            if (tier) {
                totalCost += tier.perMinute;
                
                // Update totalSpent on the project
                await db.update(projectsTable)
                  .set({ totalSpent: (p.totalSpent || 0) + tier.perMinute })
                  .where(eq(projectsTable.id, p.id));
            }
        }

        if (totalCost > 0) {
           const newCredits = user.credits - totalCost;
           
           await db.update(usersTable).set({ credits: newCredits }).where(eq(usersTable.id, userId));
           
           await db.insert(creditTransactionsTable).values({
               userId: userId,
               amount: -totalCost,
               note: `Uptime billing for ${projects.length} running projects (1 min)`,
               type: "usage",
           });

           if (newCredits < 0) {
               logger.warn({ userId, credits: newCredits }, "User out of credits, stopping projects");
               for (const p of projects) {
                   await db.update(projectsTable).set({ status: "stopped" }).where(eq(projectsTable.id, p.id));
                   
                   if (isCoolifyConfigured()) {
                     try {
                         await stopProjectWithCoolify(p.id);
                     } catch (e) {
                         logger.error({ err: e, projectId: p.id }, "Failed to stop project in Coolify due to zero balance");
                     }
                   }
               }
           }
        }
      }
    } catch (err) {
      logger.error({ err }, "Error in billing cron job");
    }
  }, BILLING_INTERVAL_MS);
}
