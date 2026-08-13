import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getUpstreamHealth } from "./v1-proxy";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const dockerApiUrl = process.env.CADVISOR_URL || "http://168.110.215.158:9091";
  let dockerOk = false;
  let dockerError = "";
  try {
    const res = await fetch(`${dockerApiUrl}/containers/json`, { timeout: 2000 });
    dockerOk = res.ok;
  } catch (err: any) {
    dockerError = err.message;
  }
  res.json({ status: "ok", dockerApiUrl, dockerOk, dockerError, version: "3" });
});

router.get("/status", async (_req, res) => {
  const health = await getUpstreamHealth();
  res.json(health);
});

export default router;
