import { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import crypto from "crypto";

export const SESSION_COOKIE = "paas_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(userId: number): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessionsTable).values({ sessionId, userId, expiresAt });
  return sessionId;
}

export async function getSessionUser(sessionId: string) {
  const [row] = await db
    .select({ user: usersTable, expiresAt: sessionsTable.expiresAt })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.sessionId, sessionId));

  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, sessionId));
    return null;
  }
  return row.user;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, sessionId));
}

export async function deleteOtherUserSessions(userId: number, currentSessionId: string): Promise<void> {
  await db
    .delete(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), ne(sessionsTable.sessionId, currentSessionId)));
}

/** Check whether a user is currently banned.
 *  - bannedAt set + bannedUntil null → permanent ban
 *  - bannedAt set + bannedUntil in the future → temp ban
 *  - bannedAt set + bannedUntil in the past → ban expired (effectively not banned)
 */
export function isUserBanned(user: { bannedAt: Date | null; bannedUntil: Date | null }): boolean {
  if (!user.bannedAt) return false;
  // Permanent ban (no end date)
  if (!user.bannedUntil) return true;
  // Temp ban – still active?
  return new Date() < new Date(user.bannedUntil);
}

export function getBanMessage(user: { bannedUntil: Date | null; banReason: string | null }): string {
  const reason = user.banReason ? ` Alasan: ${user.banReason}` : "";
  if (!user.bannedUntil) return `Akun kamu ditangguhkan secara permanen.${reason}`;
  return `Akun kamu ditangguhkan hingga ${new Date(user.bannedUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.${reason}`;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await getSessionUser(sessionId);
  if (!user) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  // Check if user is banned
  if (isUserBanned(user)) {
    // Destroy their session so they can't keep retrying
    await deleteSession(sessionId);
    res.status(403).json({ error: getBanMessage(user), code: "ACCOUNT_SUSPENDED" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
