# Railway Deployment

## Recommended setup

Use one monorepo and create two Railway services from the same repository:

1. `api` service
2. `web` service

Do not split the frontend and backend into separate repositories yet. The current monorepo keeps schema, API contracts, docs, and shared releases aligned.

## Files in this repo

- Root config: `railway.json`
- API Dockerfile: `apps/api/Dockerfile`
- Web Dockerfile: `apps/web/Dockerfile`

## Railway service configuration

Create two Railway services from the same GitHub repository.

### API service

- Root Directory: repository root
- Builder: Dockerfile
- Dockerfile Path: `apps/api/Dockerfile`

Environment variables:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES=24h`
- `JWT_REFRESH_EXPIRES=14d`
- `FIELD_ENCRYPTION_KEY`
- `INGESTION_API_KEY`
- `INGESTION_RATE_LIMIT_PER_MINUTE`
- `AI_CV_DAILY_LIMIT`
- `R2_ENDPOINT`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `APP_ENV=production`
- `APP_HOST=0.0.0.0`
- `APP_PORT=8000`

Start behavior:

- Container runs `pnpm prisma:migrate:deploy`
- Then starts `uvicorn app.main:app`

### Web service

- Root Directory: repository root
- Builder: Dockerfile
- Dockerfile Path: `apps/web/Dockerfile`

Environment variables:

- `NEXT_PUBLIC_API_URL=https://your-api-domain/v1`
- `NODE_ENV=production`

The container starts Next.js with `next start` bound to `0.0.0.0`.

## Local validation before Railway

### API

```powershell
cd apps/api
pnpm prisma:migrate:dev
pnpm prisma:generate
python -m scripts.seed_dev
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Web

```powershell
cd apps/web
pnpm dev
```

## Notes

- The API Docker image installs Node because Prisma migrations and client generation depend on the Prisma CLI.
- The web Docker image builds from the monorepo root so workspace packages remain available.
- If you add background jobs later, create a third Railway service for workers instead of overloading the API process.
