import { Router } from "express";
import { db, usersTable, projectsTable, deploymentsTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router = Router();

router.use(requireAdmin);

function formatUser(u: {
  id: number;
  email: string;
  name: string;
  role: string;
  credits: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  projectCount: number;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    credits: u.credits,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    projectCount: u.projectCount,
  };
}

// List all users with project count
router.get("/admin/users", async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      credits: usersTable.credits,
      createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginAt,
      projectCount: sql<number>`count(${projectsTable.id})::int`,
    })
    .from(usersTable)
    .leftJoin(projectsTable, eq(projectsTable.userId, usersTable.id))
    .groupBy(usersTable.id)
    .orderBy(desc(usersTable.createdAt));

  res.json(users.map((u) => formatUser({ ...u, projectCount: u.projectCount ?? 0 })));
});

// Get single user detail
router.get("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      credits: usersTable.credits,
      createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginAt,
      projectCount: sql<number>`count(${projectsTable.id})::int`,
    })
    .from(usersTable)
    .leftJoin(projectsTable, eq(projectsTable.userId, usersTable.id))
    .groupBy(usersTable.id)
    .where(eq(usersTable.id, id));

  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser({ ...row, projectCount: row.projectCount ?? 0 }));
});

// Delete a user
router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (id === admin.id) { res.status(400).json({ error: "Cannot delete your own account" }); return; }

  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }

  await logActivity(admin.id, "admin.user.deleted", undefined, { targetEmail: deleted.email });
  res.json({ success: true });
});

// List all projects with owner info
router.get("/admin/projects", async (req, res): Promise<void> => {
  const projects = await db
    .select({
      id: projectsTable.id,
      userId: projectsTable.userId,
      name: projectsTable.name,
      repoUrl: projectsTable.repoUrl,
      runtime: projectsTable.runtime,
      status: projectsTable.status,
      domain: projectsTable.domain,
      createdAt: projectsTable.createdAt,
      lastDeployedAt: projectsTable.lastDeployedAt,
      ownerEmail: usersTable.email,
      ownerName: usersTable.name,
    })
    .from(projectsTable)
    .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
    .orderBy(desc(projectsTable.createdAt));

  res.json(
    projects.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      repoUrl: p.repoUrl ?? null,
      runtime: p.runtime,
      status: p.status,
      domain: p.domain ?? null,
      createdAt: p.createdAt.toISOString(),
      lastDeployedAt: p.lastDeployedAt?.toISOString() ?? null,
      ownerEmail: p.ownerEmail,
      ownerName: p.ownerName,
    }))
  );
});

// Admin stop any project
router.post("/admin/projects/:id/stop", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .update(projectsTable)
    .set({ status: "stopped" })
    .where(eq(projectsTable.id, id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(admin.id, "admin.project.stopped", id, { projectName: project.name });

  res.json({
    id: project.id,
    userId: project.userId,
    name: project.name,
    repoUrl: project.repoUrl ?? null,
    runtime: project.runtime,
    status: project.status,
    domain: project.domain ?? null,
    createdAt: project.createdAt.toISOString(),
    lastDeployedAt: project.lastDeployedAt?.toISOString() ?? null,
  });
});

// Admin delete any project
router.delete("/admin/projects/:id", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await logActivity(admin.id, "admin.project.deleted", undefined, { projectName: project.name });
  res.json({ success: true });
});

// Admin platform stats
router.get("/admin/stats", async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [projectCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable);
  const [deploymentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(deploymentsTable);

  const projects = await db.select({ status: projectsTable.status }).from(projectsTable);
  const runningProjects = projects.filter((p) => p.status === "running").length;
  const failedProjects = projects.filter((p) => p.status === "failed").length;

  res.json({
    totalUsers: userCount?.count ?? 0,
    totalProjects: projectCount?.count ?? 0,
    totalDeployments: deploymentCount?.count ?? 0,
    runningProjects,
    failedProjects,
  });
});

export default router;
