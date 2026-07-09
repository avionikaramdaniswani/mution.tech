---
name: CSRF/CORS origin allowlist on Replit's proxy
description: Why a strict Origin allowlist for CSRF/CORS checks breaks logins/POSTs on Replit, and the correct same-origin fallback.
---

A CSRF/CORS guard that only allows a hardcoded list of origins (prod domain + `REPLIT_DEV_DOMAIN` captured at boot) will intermittently or permanently reject legitimate same-origin requests on Replit.

**Why:**
1. Replit preview/dev domains can rotate or differ from what `REPLIT_DEV_DOMAIN` held at process start, so a static allowlist drifts out of sync with the real browser Origin.
2. Behind Replit's proxy, the browser's `Origin` header often includes a port (e.g. `https://<domain>:5000`) while the `Host` header the app receives does not carry that port. A naive `origin === protocol://host` same-origin check fails on this port mismatch alone, even though the request is genuinely same-origin.

Symptom: POST requests (e.g. `/api/auth/login`) consistently return 403 "Invalid request origin" or "Invalid CSRF token" even though the CSRF cookie/token logic itself is correct and verified working via curl with manually matched cookies/headers.

**How to apply:** When validating Origin for CSRF/CORS on Replit-hosted apps, don't rely solely on a static allowlist. Add a same-origin fallback that compares the Origin's `protocol` + `hostname` (ignoring port) against the request's actual `Host`/`X-Forwarded-Host` + `X-Forwarded-Proto`. Temporarily logging `Origin`, `Referer`, `Host`, `X-Forwarded-*` on the 403 path is the fastest way to confirm the exact mismatch before fixing.
