FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN chmod +x docker/entrypoint.sh
RUN pnpm build

EXPOSE 3000
ENTRYPOINT ["sh", "docker/entrypoint.sh"]
