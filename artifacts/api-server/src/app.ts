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

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.use("/api/billing/tripay/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "50mb" }));

app.use("/api", router);
app.use("/v1", v1Router);

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
