---
name: Cached token transparency (Opsi C)
description: Decision on how AI prompt-cache tokens are tracked and displayed without changing billing
---

Cached tokens (prompt cache hits reported by providers) are recorded and shown to users for transparency, but pricing stays flat — cachedTokens must never be subtracted from or otherwise factor into credit/pricing calculations.

**Why:** User chose "Opsi C" over a cache-discount model (Opsi B) to avoid an unproven business decision (how much discount, which margin impact) before having real usage data. Revenue model (input price × input tokens, flat) stays unchanged; cached token count is informational only.

**How to apply:** If later asked to implement a cache discount (Opsi B), the pricing/credit calculation function must be updated deliberately and separately — don't assume cachedTokens already reduces billed tokens anywhere in the proxy code. Data collected under Opsi C (cachedTokens columns on api_usage/api_requests) can inform that future decision.
