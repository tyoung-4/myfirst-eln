# myfirst-eln

A lightweight Electronic Lab Notebook (ELN) built with Next.js, Prisma, and TipTap.

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Run app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Deployment

You do **not** need two separate Docker setups.

This repo now uses **one Docker setup** with two compose modes:
- default SQLite mode (simple, lightweight)
- optional Postgres profile (for future migration)

### 1) SQLite mode (default)

```bash
docker compose up --build
```

- App: [http://localhost:3000](http://localhost:3000)
- Data persisted in Docker volume: `sqlite_data`

### 2) Postgres profile

```bash
docker compose --profile postgres up --build
```

- App: [http://localhost:3000](http://localhost:3000)
- Postgres: `localhost:5432`
- App container uses `DB_MODE=postgres` and auto-applies schema with Prisma `db push`.

## Docker Files

- `Dockerfile`: production image build and app startup
- `docker-compose.yml`: SQLite default + Postgres profile
- `docker/entrypoint.sh`: selects Prisma schema/bootstrap flow by `DB_MODE`
- `.dockerignore`: keeps image small and avoids leaking local env/db files

## Prisma Schemas

- `prisma/schema.prisma`: SQLite schema (current default)
- `prisma/schema.postgres.prisma`: Postgres-compatible schema (migration path)

## Stack

- Next.js 16
- React 19
- Prisma
- Tailwind CSS
- TipTap editor

## License

MIT (add license file)
