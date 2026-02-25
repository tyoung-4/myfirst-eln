#!/bin/sh
set -eu

PORT="${PORT:-3000}"
DB_MODE="${DB_MODE:-sqlite}"

if [ "$DB_MODE" = "postgres" ]; then
  echo "[entrypoint] Starting in Postgres mode"
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "[entrypoint] DATABASE_URL is required for Postgres mode"
    exit 1
  fi

  pnpm prisma generate --schema prisma/schema.postgres.prisma
  pnpm prisma db push --schema prisma/schema.postgres.prisma
else
  echo "[entrypoint] Starting in SQLite mode"
  mkdir -p /app/data
  export DATABASE_URL="${DATABASE_URL:-file:/app/data/dev.db}"

  pnpm prisma generate --schema prisma/schema.prisma
  pnpm prisma migrate deploy --schema prisma/schema.prisma
fi

exec pnpm exec next start -H 0.0.0.0 -p "$PORT"
