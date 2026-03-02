FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

RUN pnpm --dir apps/web build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --dir apps/web exec next start -H 0.0.0.0 -p 3000"]
