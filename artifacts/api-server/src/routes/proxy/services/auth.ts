import type { Request, Response } from "express";
import crypto from "crypto";
import { db, apiKeysTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { updateApiRequestLog } from "./logging";

export function extractToken(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.trim()) return xApiKey.trim();
  return null;
}

export async function resolveKeyAndUser(token: string) {
  if (!token.startsWith("mk_live_")) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .select({ key: apiKeysTable, user: usersTable })
    .from(apiKeysTable)
    .innerJoin(usersTable, eq(apiKeysTable.userId, usersTable.id))
    .where(eq(apiKeysTable.keyHash, hash));
  if (!row || !row.key.isActive) return null;
  return row;
}

export async function authenticate(req: Request, res: Response): Promise<{ key: typeof apiKeysTable.$inferSelect; user: typeof usersTable.$inferSelect } | null> {
  const token = extractToken(req);
  if (!token) {
    updateApiRequestLog(res, { errorType: "authentication_error" });
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Missing Authorization header or x-api-key" } });
    return null;
  }
  const row = await resolveKeyAndUser(token);
  if (!row) {
    updateApiRequestLog(res, { errorType: "authentication_error" });
    res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Invalid or revoked API key" } });
    return null;
  }
  updateApiRequestLog(res, { userId: row.user.id, keyId: row.key.id });

  if (row.user.bannedAt) {
    const isPermanent = !row.user.bannedUntil;
    const isStillBanned = isPermanent || new Date() < new Date(row.user.bannedUntil!);
    if (isStillBanned) {
      updateApiRequestLog(res, { errorType: "forbidden" });
      res.status(403).json({ type: "error", error: { type: "forbidden", message: "Account suspended. Contact support at mution.tech" } });
      return null;
    }
  }

  if (row.key.expiresAt && new Date() > new Date(row.key.expiresAt)) {
    updateApiRequestLog(res, { errorType: "forbidden" });
    res.status(403).json({ type: "error", error: { type: "forbidden", message: "API key has expired" } });
    return null;
  }
  if (row.key.creditLimit !== null && row.key.totalCreditsUsed >= row.key.creditLimit) {
    updateApiRequestLog(res, { errorType: "forbidden" });
    res.status(403).json({ type: "error", error: { type: "forbidden", message: "API key has reached its quota limit" } });
    return null;
  }

  return row;
}
