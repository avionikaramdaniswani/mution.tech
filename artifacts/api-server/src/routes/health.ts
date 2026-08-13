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
    const containersRes = await fetch(`${dockerApiUrl}/containers/json`);
    const containers = await containersRes.json();
    const uuid = 'o6wt4078k85wlvi93pctxhxr';
    const appContainer = containers.find((c: any) => c.Names && c.Names.some((name: string) => name.includes(uuid)));
    if (!appContainer) return res.json({ error: "no container" });
    const statsRes = await fetch(`${dockerApiUrl}/containers/${appContainer.Id}/stats?stream=false`);
    const stats = await statsRes.json();
    res.json({ 
       memLimit: stats.memory_stats?.limit,
       memUsage: stats.memory_stats?.usage,
       cache: stats.memory_stats?.stats?.cache
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
