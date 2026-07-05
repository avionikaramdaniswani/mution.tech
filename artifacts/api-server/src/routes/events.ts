import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { addUserClient, removeUserClient } from "../lib/events";

const router = Router();

// Stream SSE untuk user yang sedang login — dipakai agar saldo/profil di UI
// (mis. saldo di navbar) ter-update seketika tanpa refresh halaman.
router.get("/events", requireAuth, (req, res): void => {
  const user = (req as any).user;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Event awal supaya client tahu koneksi hidup.
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  addUserClient(user.id, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      removeUserClient(user.id, res);
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeUserClient(user.id, res);
  });
});

export default router;
