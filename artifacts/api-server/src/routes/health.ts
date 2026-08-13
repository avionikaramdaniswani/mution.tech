import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getUpstreamHealth } from "./v1-proxy";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const dockerApiUrl = process.env.CADVISOR_URL || "http://168.110.215.158:9091";
  let dockerOk = false;
  let dockerError = "";
  try {
    const res = await fetch(`${dockerApiUrl}/containers/json`);
    dockerOk = res.ok;
  } catch (err: any) {
    dockerError = err.message;
  }
  res.json({ status: "ok", dockerApiUrl, dockerOk, dockerError, version: "4" });
});

router.get("/test-metrics", async (_req, res) => {
  const dockerApiUrl = process.env.CADVISOR_URL || "http://168.110.215.158:9091";
  try {
    const { db } = await import("../db/index.js");
    const { coolifyResourcesTable } = await import("../db/schema.js");
    const { eq } = await import("drizzle-orm");
    const [resource] = await db.select().from(coolifyResourcesTable).where(eq(coolifyResourcesTable.projectId, 17));
    
    const containersRes = await fetch(`${dockerApiUrl}/containers/json`);
    const containers = await containersRes.json();
    const uuid = resource?.coolifyApplicationUuid;
    const appContainer = containers.find((c: any) => c.Names && c.Names.some((name: string) => name.includes(uuid || 'missing')));
    
    let stats = null;
    if (appContainer) {
      const statsRes = await fetch(`${dockerApiUrl}/containers/${appContainer.Id}/stats?stream=false`);
      stats = await statsRes.json();
    }

    res.json({ 
       dbUuid: uuid,
       containerId: appContainer?.Id,
       memLimit: stats?.memory_stats?.limit,
       memUsage: stats?.memory_stats?.usage
    });
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

router.get("/status", async (_req, res) => {
  const health = await getUpstreamHealth();
  res.json(health);
});

export default router;
