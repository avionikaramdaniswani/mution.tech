import type { NextFunction, Request, Response } from "express";
import type { CorsOptionsDelegate } from "cors";
import crypto from "crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
export const CSRF_COOKIE = "paas_csrf";
export const CSRF_HEADER = "X-CSRF-Token";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://mution.tech",
  "https://www.mution.tech",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5000",
  "http://localhost:5173",
];

function splitEnvList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function originFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);

  for (const value of splitEnvList(process.env.ALLOWED_ORIGINS)) {
    const origin = originFromUrl(value) ?? value.replace(/\/+$/, "");
    origins.add(origin);
  }

  for (const value of [
    process.env.PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.GITHUB_CALLBACK_URL,
  ]) {
    const origin = originFromUrl(value);
    if (origin) origins.add(origin);
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }

  return origins;
}

export function isAllowedOrigin(origin: string | undefined, req?: Request): boolean {
  if (!origin) return true;
  if (getAllowedOrigins().has(origin)) return true;

  // Same-origin request (Origin host/proto matches the Host this request actually hit).
  // Covers Replit preview/dev domains that rotate per session and can't be hardcoded.
  if (req) {
    const forwardedHost = req.header("X-Forwarded-Host");
    const host = (forwardedHost ? forwardedHost.split(",")[0].trim() : "") || req.header("Host");
    if (host) {
      const forwardedProto = req.header("X-Forwarded-Proto");
      const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : req.protocol;
      try {
        const originUrl = new URL(origin);
        // Compare protocol + hostname only. Behind Replit's proxy the public-facing
        // Origin port (e.g. :5000) often differs from the internal Host header,
        // which arrives without a port — a port-only mismatch is not cross-origin.
        const hostOnly = host.split(":")[0];
        if (originUrl.protocol === `${proto}:` && originUrl.hostname === hostOnly) return true;
      } catch {
        // ignore malformed origin/host header
      }
    }
  }

  return false;
}

export const corsOptions: CorsOptionsDelegate<Request> = (req, callback) => {
  const origin = req.header("Origin");
  callback(null, {
    origin: isAllowedOrigin(origin, req),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-CSRF-Token"],
  });
};

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
}

function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function isValidCsrfToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function issueCsrfToken(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE];
  const token = isValidCsrfToken(existing) ? existing : crypto.randomBytes(32).toString("base64url");
  setCsrfCookie(res, token);
  return token;
}

function originFromRequestHeader(req: Request): string | null {
  const origin = req.header("Origin");
  if (origin) return origin;

  const referer = req.header("Referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function csrfOriginGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (req.path === "/billing/tripay/webhook" || req.path === "/billing/payment/notify") {
    next();
    return;
  }

  const origin = originFromRequestHeader(req);
  if (!origin || !isAllowedOrigin(origin, req)) {
    res.status(403).json({ error: "Invalid request origin" });
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header(CSRF_HEADER);
  if (!isValidCsrfToken(cookieToken) || !isValidCsrfToken(headerToken) || !timingSafeEqualString(cookieToken, headerToken)) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  key?: (req: Request) => string;
}

type Bucket = {
  resetAt: number;
  count: number;
};

const rateLimitBuckets = new Map<string, Bucket>();

function cleanupExpiredBuckets(now: number): void {
  if (rateLimitBuckets.size < 10_000) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function hashKey(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const rawKey = options.key?.(req) ?? req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${options.keyPrefix}:${hashKey(rawKey)}`;
    const current = rateLimitBuckets.get(key);
    const bucket = current && current.resetAt > now
      ? current
      : { resetAt: now + options.windowMs, count: 0 };

    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    const max = Number.isFinite(options.max) && options.max > 0 ? Math.floor(options.max) : 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
}

export function authRateLimitKey(req: Request): string {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  return `${req.ip ?? "unknown"}:${email}`;
}

export function apiKeyRateLimitKey(req: Request): string {
  const auth = req.header("Authorization");
  const apiKey = req.header("X-API-Key");
  return auth || apiKey || req.ip || "unknown";
}
