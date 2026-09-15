import app from "./app";
import { logger } from "./lib/logger";
import { startBillingCron } from "./cron/billing";
import { seedProvidersFromEnv } from "./routes/v1-proxy";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startBillingCron();

  // One-time migration: seed providers from env vars into DB
  seedProvidersFromEnv().catch((e) =>
    logger.error({ err: e }, "Failed to seed providers from env"),
  );
});
