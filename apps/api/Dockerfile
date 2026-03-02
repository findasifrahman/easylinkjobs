FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates nodejs npm \
  && npm install -g pnpm@10.4.1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/pyproject.toml ./apps/api/pyproject.toml
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm --dir apps/api install --frozen-lockfile

COPY apps/api ./apps/api

RUN pip install --no-cache-dir -e ./apps/api \
  && pnpm --dir apps/api prisma:generate

WORKDIR /app/apps/api

EXPOSE 8000

CMD ["sh", "-c", "pnpm prisma:migrate:deploy && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
