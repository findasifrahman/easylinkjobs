# Railway Web Deployment

## Service type

Create a dedicated Railway service for the Next.js frontend.

- Service name: `web`
- Repository: this monorepo
- Root directory: repository root
- Builder: `Dockerfile`
- Dockerfile path: `apps/web/Dockerfile`

Do not rely on the root `railway.json` to choose the builder. The builder must be selected in the Railway service settings for this service.

## Required environment variables

Set these in the Railway `web` service:

- `NEXT_PUBLIC_API_URL=https://<api-domain>/v1`
- `NEXT_PUBLIC_APP_URL=https://<web-domain>`
- `NEXT_PUBLIC_DEFAULT_LOCALE=en`
- `NEXT_PUBLIC_SUPPORTED_LOCALES=en,zh,bn`
- `NODE_ENV=production`

If you later add analytics pixels, add only the public variables required by the frontend. Do not expose backend secrets here.

## Deploy behavior

The web Dockerfile already does the following:

1. installs workspace dependencies from the monorepo root
2. builds the Next.js app in `apps/web`
3. starts `next start`

That means you do not need a separate Railway start command if you keep using `apps/web/Dockerfile`.

## Domain wiring

1. Deploy the `api` service first.
2. Copy the public API URL.
3. Set `NEXT_PUBLIC_API_URL=https://<api-domain>/v1` in the `web` service.
4. Redeploy the `web` service.

## First deploy checklist

1. Confirm the `web` service points to `apps/web/Dockerfile`.
2. Confirm `NEXT_PUBLIC_API_URL` points to the deployed API, not `localhost`.
3. Trigger deploy.
4. Open the deployed frontend.
5. Verify login, jobs list, and locale routes work.

## Common failure

If Railway says:

- `Dockerfile \`Dockerfile\` does not exist`

then the service is trying to build from repo root without a Dockerfile path.

Fix it in the Railway service settings:

- Builder: `Dockerfile`
- Dockerfile path: `apps/web/Dockerfile`
