import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { fileURLToPath } from "url";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import v1Router from "./routes/v1-proxy";
import { logger } from "./lib/logger";
import { corsOptions, csrfOriginGuard, globalApiRateLimit, securityHeaders } from "./lib/security";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, "../../paas-dashboard/dist/public");

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(securityHeaders);
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

// Webhook TriPay HARUS pakai raw body untuk verifikasi signature — daftarkan SEBELUM json/urlencoded
app.use("/api/billing/tripay/webhook", express.raw({ type: "*/*" }));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", globalApiRateLimit);
app.use("/api", csrfOriginGuard);

app.use("/api", router);
app.use("/v1", v1Router);
// Also serve AI proxy routes at root level (no /v1 prefix) for clients like
// Codex CLI that use base_url without a path and append e.g. /responses directly.
app.use("/", v1Router);

const V1_PROXY_PATHS = ["/chat", "/completions", "/embeddings", "/messages", "/responses", "/models"];

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback: serve index.html for all non-API routes
  app.get(/(.*)/, (_req: Request, res: Response) => {
    // Skip API routes - they're already handled above
    if (
      _req.path === "/api" || _req.path.startsWith("/api/") ||
      _req.path === "/v1" || _req.path.startsWith("/v1/") ||
      V1_PROXY_PATHS.some((p) => _req.path === p || _req.path.startsWith(p + "/"))
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
