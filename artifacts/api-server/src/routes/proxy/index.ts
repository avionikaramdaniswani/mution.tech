import { Router } from "express";
import { rateLimit, apiKeyRateLimitKey } from "../../lib/security";
import { apiRequestLogger } from "./services/logging";
import { proxyMessages } from "./handlers/claude";
import { proxyOpenAI } from "./handlers/openai";
import { proxyResponses } from "./handlers/responses";
import { listModels } from "./handlers/models";

const router = Router();
const AiProxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AI_PROXY_RATE_LIMIT_PER_MINUTE ?? 120),
  keyPrefix: "ai-proxy",
  key: apiKeyRateLimitKey,
});

router.use(apiRequestLogger);
router.use(AiProxyLimiter);

router.post("/messages", (req, res) => proxyMessages(req, res));
router.post("/chat/completions", (req, res) => proxyOpenAI(req, res, "/chat/completions"));
router.post("/responses", (req, res) => proxyResponses(req, res));
router.get("/models", (req, res) => listModels(req, res));
router.post("/completions", (req, res) => proxyOpenAI(req, res, "/completions"));
router.post("/embeddings", (req, res) => proxyOpenAI(req, res, "/embeddings"));

export default router;

// Re-export services & handlers for external consumers
export * from "./types";
export * from "./services/providers";
export * from "./services/billing";
export * from "./services/auth";
export * from "./services/logging";
export * from "./handlers/claude";
export * from "./handlers/openai";
export * from "./handlers/responses";
export * from "./handlers/models";
