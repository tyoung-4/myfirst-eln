#!/bin/sh
set -eu

PORT="${PORT:-3000}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL is required"
  exit 1
fi

echo "[entrypoint] Starting in PostgreSQL mode"
pnpm prisma generate --schema prisma/schema.prisma
pnpm prisma db push --schema prisma/schema.prisma

exec pnpm exec next start -H 0.0.0.0 -p "$PORT"
