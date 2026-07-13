---
name: Responses API tool-calling adapter
description: The /responses endpoint (Codex) previously dropped all tool/function-call data when translating to/from Chat Completions.
---

The generic Responses API ⇄ Chat Completions adapter in the API proxy originally only translated plain text messages. It silently dropped `tools`/`tool_choice` on the way to the upstream provider, and dropped `tool_calls` on the way back (both in the JSON and streaming paths). This meant **no** model — not just newly-added ones — could actually act as a coding agent through `/responses` (Codex), only chat.

**Why:** discovered while wiring up a new OpenAI-compatible provider for Codex-only support; verified with live curl tests that the provider itself returns proper `tool_calls`, but the adapter had no code path to carry that through Responses API's `function_call` / `function_call_output` item types.

**How to apply:** when onboarding any new model/provider intended for Codex (`/responses`) use, don't assume wiring the provider + model catalog entry is sufficient — confirm the adapter still forwards tool calls end-to-end (this was fixed, but re-verify if the adapter is touched again).
