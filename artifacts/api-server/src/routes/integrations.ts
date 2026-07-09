import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { CoolifyError, getCoolifyIntegrationStatus } from "../lib/coolify";

const router = Router();

router.get("/integrations/coolify/status", requireAuth, async (_req, res): Promise<void> => {
  try {
    res.json(await getCoolifyIntegrationStatus());
  } catch (err) {
    res.status(err instanceof CoolifyError ? 502 : 500).json({
      configured: true,
      serverResolved: false,
      serverUuid: null,
      serverName: null,
      error: err instanceof CoolifyError ? err.message : "Gagal cek integrasi deployment",
    });
  }
});

export default router;
