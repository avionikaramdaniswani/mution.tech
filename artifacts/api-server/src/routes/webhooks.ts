import { Router } from "express";
import { db, projectsTable, deploymentsTable } from "@workspace/db";
import { eq, like, or } from "drizzle-orm";
import { deployProjectWithCoolify, formatCoolifyBuildLog, isCoolifyConfigured, sanitizeDeploymentProviderText } from "../lib/coolify";
import { logger } from "../lib/logger";

const router = Router();

// Endpoint webhook publik dari GitHub push event
router.post("/webhooks/github", async (req, res): Promise<void> => {
  const event = req.headers["x-github-event"];
  
  // Ping event dari GitHub saat webhook pertama kali didaftarkan
  if (event === "ping") {
    res.json({ message: "Mution GitHub webhook active" });
    return;
  }

  if (event !== "push") {
    res.json({ message: `Ignored event: ${String(event)}` });
    return;
  }

  const payload = req.body ?? {};
  const repoFullName = payload.repository?.full_name; // e.g. "owner/repo"
  const repoCloneUrl = payload.repository?.clone_url;  // e.g. "https://github.com/owner/repo.git"
  const ref = payload.ref; // e.g. "refs/heads/main"
  const commitHash = payload.head_commit?.id || payload.after || "head";
  const commitMessage = payload.head_commit?.message || "Auto-deploy via git push";

  if (!repoFullName && !repoCloneUrl) {
    res.status(400).json({ error: "Payload webhook tidak memuat informasi repository" });
    return;
  }

  // Cari proyek yang terhubung dengan repo ini
  const projects = await db
    .select()
    .from(projectsTable)
    .where(
      or(
        like(projectsTable.repoUrl, `%${repoFullName}%`),
        repoCloneUrl ? eq(projectsTable.repoUrl, repoCloneUrl) : undefined,
      ),
    );

  if (projects.length === 0) {
    res.json({ message: "Tidak ada proyek terdaftar yang cocok dengan repository ini" });
    return;
  }

  // Trigger deployment untuk setiap proyek yang cocok
  const triggered: number[] = [];
  for (const project of projects) {
    try {
      const [deployment] = await db
        .insert(deploymentsTable)
        .values({
          projectId: project.id,
          status: isCoolifyConfigured() ? "queued" : "running",
          commitHash: String(commitHash).slice(0, 40),
          commitMessage: String(commitMessage).slice(0, 500),
          buildLog: "Git push terdeteksi. Deployment otomatis dimulai.",
          deployedAt: isCoolifyConfigured() ? null : new Date(),
        })
        .returning();

      await db
        .update(projectsTable)
        .set({ status: "deploying" })
        .where(eq(projectsTable.id, project.id));

      if (isCoolifyConfigured()) {
        const result = await deployProjectWithCoolify(project, deployment.id);
        await db
          .update(deploymentsTable)
          .set({
            status: "deploying",
            buildLog: formatCoolifyBuildLog({
              message: result.message,
              applicationUuid: result.applicationUuid,
              deploymentUuid: result.deploymentUuid,
            }),
          })
          .where(eq(deploymentsTable.id, deployment.id));
      }

      triggered.push(project.id);
    } catch (err) {
      logger.error({ err, projectId: project.id }, "Auto-deploy webhook trigger failed");
    }
  }

  res.json({ success: true, triggeredProjects: triggered });
});

export default router;
