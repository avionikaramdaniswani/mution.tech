import { Router } from "express";
import { db, projectsTable, deploymentsTable, activityLogsTable } from "@workspace/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

router.get("/stats/dashboard", async (req, res): Promise<void> => {
  const user = (req as any).user;

  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id));

  const totalProjects = projects.length;
  const runningProjects = projects.filter((p) => p.status === "running").length;
  const failedProjects = projects.filter((p) => p.status === "failed").length;

  const projectIds = projects.map((p) => p.id);

  let totalDeployments = 0;
  let successfulDeployments = 0;
  let recentDeployments: any[] = [];

  if (projectIds.length > 0) {
    const allDeployments = await db
      .select()
      .from(deploymentsTable)
      .where(sql`${deploymentsTable.projectId} = ANY(${sql`ARRAY[${sql.join(projectIds.map((id) => sql`${id}`), sql`, `)}]::int[]`})`)
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(5);

    totalDeployments = allDeployments.length;
    successfulDeployments = allDeployments.filter((d) => d.status === "running").length;
    recentDeployments = allDeployments.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      status: d.status,
      commitHash: d.commitHash ?? null,
      commitMessage: d.commitMessage ?? null,
      buildLog: d.buildLog ?? null,
      createdAt: d.createdAt.toISOString(),
      deployedAt: d.deployedAt?.toISOString() ?? null,
      durationMs: d.durationMs ?? null,
    }));
  }

  res.json({
    totalProjects,
    runningProjects,
    failedProjects,
    totalDeployments,
    successfulDeployments,
    recentDeployments,
  });
});

router.get("/stats/deployments", async (req, res): Promise<void> => {
  const user = (req as any).user;

  const projects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id));

  const projectIds = projects.map((p) => p.id);

  const byStatus = [
    { status: "running", count: 0 },
    { status: "failed", count: 0 },
    { status: "queued", count: 0 },
    { status: "building", count: 0 },
    { status: "stopped", count: 0 },
    { status: "rolled_back", count: 0 },
  ];

  const last30Days: { date: string; count: number }[] = [];

  if (projectIds.length > 0) {
    const deployments = await db
      .select()
      .from(deploymentsTable)
      .where(sql`${deploymentsTable.projectId} = ANY(${sql`ARRAY[${sql.join(projectIds.map((id) => sql`${id}`), sql`, `)}]::int[]`})`);

    for (const d of deployments) {
      const match = byStatus.find((s) => s.status === d.status);
      if (match) match.count++;
    }

    // Aggregate last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const countMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      countMap.set(d.toISOString().slice(0, 10), 0);
    }

    for (const d of deployments) {
      const day = d.createdAt.toISOString().slice(0, 10);
      if (countMap.has(day)) {
        countMap.set(day, (countMap.get(day) ?? 0) + 1);
      }
    }

    for (const [date, count] of countMap.entries()) {
      last30Days.push({ date, count });
    }
    last30Days.sort((a, b) => a.date.localeCompare(b.date));
  }

  res.json({ byStatus, last30Days });
});

export default router;
