#!/bin/bash
set -e

# Install dependencies
pnpm install --frozen-lockfile

# Apply DB migrations non-interactively (safe in CI / non-TTY shells).
# Uses drizzle-orm migrate() against SQL files in lib/db/migrations/.
# Do NOT use `drizzle-kit push` here — it requires a TTY for confirmations.
pnpm --filter @workspace/db run migrate
