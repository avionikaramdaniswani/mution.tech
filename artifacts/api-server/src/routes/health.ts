import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getUpstreamHealth } from "./v1-proxy";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const dockerApiUrl = process.env.DOCKER_API_URL?.trim();
  let dockerOk = false;
  let dockerError = "";
  if (!dockerApiUrl) {
    dockerError = "DOCKER_API_URL is not configured";
  } else {
    try {
      const dockerRes = await fetch(`${dockerApiUrl}/_ping`, { signal: AbortSignal.timeout(5_000) });
      dockerOk = dockerRes.ok;
      if (!dockerRes.ok) dockerError = `Docker API returned HTTP ${dockerRes.status}`;
    } catch (err: any) {
      dockerError = err.message;
    }
  }
  res.json({ status: "ok", dockerConfigured: !!dockerApiUrl, dockerOk, dockerError, version: "4" });
});

router.get("/status", async (_req, res) => {
  const health = await getUpstreamHealth();
  res.json(health);
});

export default router;
