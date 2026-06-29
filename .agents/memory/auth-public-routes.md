---
name: AuthProvider publicRoutes guard
description: use-auth.tsx redirects unauthenticated users to "/" if the current route isn't in the publicRoutes whitelist — must be updated whenever a new public page is added.
---

## The rule

`artifacts/paas-dashboard/src/hooks/use-auth.tsx` has a `publicRoutes` array inside `AuthProvider`. Any route NOT in this list causes a redirect to `"/"` for unauthenticated users.

**Why:** The guard was added to protect app routes from unauthenticated access. It uses an allowlist, not a blocklist, so new public pages are blocked by default unless explicitly added.

**How to apply:** Every time a new public/static page is added (e.g. `/tentang-kami`, `/privacy-policy`, `/blog`, etc.), its path must be added to the `publicRoutes` array in `use-auth.tsx`. Forgetting this causes the page to silently redirect to the landing page for logged-out users — looks identical to a routing bug.
