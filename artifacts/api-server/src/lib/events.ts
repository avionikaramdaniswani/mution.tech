import type { Response } from "express";
import { logger } from "./logger";

/**
 * Broadcaster Server-Sent Events (SSE) in-memory.
 *
 * Dua kanal:
 *  - per-user  → dipakai untuk push perubahan yang hanya relevan bagi 1 user
 *               (mis. saldo kredit berubah karena topup / pemakaian / penyesuaian admin).
 *  - admin     → dipakai untuk push ke semua admin yang sedang membuka panel
 *               (mis. ada user baru, order lunas, saldo user diubah).
 *
 * Catatan skala: ini menyimpan koneksi di memori satu proses. Kalau API di-scale
 * ke banyak instance, ganti dengan pub/sub lintas-proses (mis. Redis pub/sub)
 * sambil tetap memakai antarmuka fungsi di bawah.
 */

export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

const userClients = new Map<number, Set<Response>>();
const adminClients = new Set<Response>();

export function addUserClient(userId: number, res: Response): void {
  let set = userClients.get(userId);
  if (!set) { set = new Set(); userClients.set(userId, set); }
  set.add(res);
}

export function removeUserClient(userId: number, res: Response): void {
  const set = userClients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) userClients.delete(userId);
}

export function addAdminClient(res: Response): void {
  adminClients.add(res);
}

export function removeAdminClient(res: Response): void {
  adminClients.delete(res);
}

function write(res: Response, event: RealtimeEvent): boolean {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    return true;
  } catch (err) {
    logger.warn({ err }, "Gagal menulis ke koneksi SSE");
    return false;
  }
}

/** Kirim event ke semua koneksi milik satu user. */
export function broadcastToUser(userId: number, event: RealtimeEvent): void {
  const set = userClients.get(userId);
  if (!set || set.size === 0) return;
  for (const res of set) {
    if (!write(res, event)) removeUserClient(userId, res);
  }
}

/** Kirim event ke semua koneksi admin. */
export function broadcastAdmin(event: RealtimeEvent): void {
  if (adminClients.size === 0) return;
  for (const res of adminClients) {
    if (!write(res, event)) adminClients.delete(res);
  }
}
