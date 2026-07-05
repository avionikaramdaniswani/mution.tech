import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getUpstreamHealth } from "./v1-proxy";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/status", (_req, res) => {
  const health = getUpstreamHealth();
  res.json(health);
});

export default router;
