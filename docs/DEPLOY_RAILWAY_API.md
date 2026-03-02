# Railway API Deployment

## Service type

Create a dedicated Railway service for the FastAPI backend.

- Service name: `api`
- Repository: this monorepo
- Root directory: repository root
- Builder: `Dockerfile`
- Dockerfile path: `apps/api/Dockerfile`

Do not rely on the root `railway.json` to choose the builder. The builder must be selected in the Railway service settings for this service.

## Required environment variables

Set these in the Railway `api` service:

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
- `DISABLE_RATE_LIMITS=false`

## Deploy behavior

The API Dockerfile already does the following:

1. installs system dependencies
2. installs Python + Node dependencies required for Prisma
3. runs `pnpm prisma:migrate:deploy`
4. starts `uvicorn app.main:app`

That means you do not need a separate Railway start command if you keep using `apps/api/Dockerfile`.

## Health checks

Recommended Railway health check:

- Path: `/docs`
- Port: `8000`

This is not ideal as a long-term health endpoint, but it is enough until you add a dedicated `/healthz` route.

## First deploy checklist

1. Confirm `DATABASE_URL` points to the Railway Postgres instance.
2. Confirm `REDIS_URL` points to the Railway Redis instance.
3. Confirm all JWT secrets are rotated and unique in production.
4. Confirm R2 credentials are valid and not your local dev values.
5. Trigger deploy.
6. Open `https://<api-domain>/docs` and verify FastAPI responds.

## Common failure

If Railway says:

- `Dockerfile \`Dockerfile\` does not exist`

then the service is trying to build from repo root without a Dockerfile path.

Fix it in the Railway service settings:

- Builder: `Dockerfile`
- Dockerfile path: `apps/api/Dockerfile`
