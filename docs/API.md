# API (FastAPI Modular Monolith)

Base path: `/v1`

Response envelope:
- success: `{ "ok": true, "data": ..., "error": null }`
- error: `{ "ok": false, "data": null, "error": { "code", "message", "details?" } }`

## Auth model
- Access token: JWT Bearer, short-lived (`JWT_ACCESS_EXPIRES`, default `24h`)
- Refresh token: JWT Bearer, long-lived (`JWT_REFRESH_EXPIRES`, default `14d`)
- Web “Remember me”:
  - checked: access + refresh tokens are kept in `localStorage`
  - unchecked: access + refresh tokens are kept in `sessionStorage` for the current browser session only
- Refresh sessions are tracked in:
  - Postgres: `auth_sessions`
  - Redis: `session:{session_id}` (TTL aligned to refresh expiry)
- Password rules:
  - at least 8 chars
  - at least one uppercase letter
  - at least one lowercase letter
  - at least one number

## RBAC model
- Dynamic RBAC is loaded from DB tables:
  - `roles`, `permissions`, `role_permissions`, `user_roles`
- Permission dependency:
  - `require_permission("jobs:create")`
- Permission cache:
  - Redis set key: `perm:{user_id}:{company_id|global}`
  - short TTL (default 120s)

## Endpoint list

### Health
- `GET /healthz`

### Auth
- `POST /auth/signup`
- `POST /auth/signup/candidate`
- `POST /auth/signup/company`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
  - creates a one-time reset token in `password_reset_tokens`
  - email sending is placeholder for now; the reset URL is logged server-side
- `POST /auth/reset-password`
- `POST /auth/change-password`

### Users
- `GET /users/me`

### Candidates
- `GET /candidate/profile`
- `PUT /candidate/profile`
- `GET|POST|PUT|DELETE /candidate/education`
- `GET|POST|PUT|DELETE /candidate/experience`
- `GET|POST|PUT|DELETE /candidate/skills`
- `GET|POST|PUT|DELETE /candidate/certifications`
- `GET|POST|PUT|DELETE /candidate/documents`
- `POST /candidate/claim/{token}` (placeholder)

### Companies
- `POST /companies/` (permission: `companies:create`)
- `GET /companies/`
- `GET /companies/{company_id}`
- `PATCH /companies/{company_id}` (permission: `companies:update`)

### Jobs
- `GET /jobs/public`
- `GET /jobs/public/{job_id}`
- `GET /jobs/mine?company_id=...`
- `POST /jobs/` (permission: `jobs:create`)
- `PATCH /jobs/{job_id}` (permission: `jobs:update`)
- `DELETE /jobs/{job_id}` (permission: `jobs:delete`)

### Applications
- `POST /applications/apply`
- `GET /applications/` (permission: `applications:read`)
- `GET /applications/company/{company_id}/overview` (permission: `applications:read`)
- `GET /applications/company/{company_id}/applicants` (permission: `applications:read`)
- `PATCH /applications/{application_id}/status` (permission: `applications:update`)
- `GET /applications/{application_id}/notes` (permission: `applications:read`)
- `POST /applications/{application_id}/notes` (permission: `applications:update`)

### Content
- `GET /content/blog`
- `GET /content/blog/{slug}`
- `GET /content/tutorials`
- `GET /content/tutorials/{slug}`

### AI
- `POST /ai/keys/openai`
- `DELETE /ai/keys/openai`
- `POST /ai/cv/generate`
- `POST /ai/chat`
- `GET /ai/export/candidate-profile`
- `GET /ai/export/jobs/{job_id}`

### Billing
- `GET /billing/plans`
- `GET /billing/providers`

### Ingest
- `POST /ingest/jobs`
  - requires `X-Ingestion-Key`

### Media
- `POST /media/presign` (preferred)
- `POST /media/signed-upload` (legacy alias)

### Tracking
- `POST /tracking/events` (rate-limited)
  - supports anonymous + logged users
  - uses `anonymous_id` cookie and `session_id`

### Admin
- `GET /admin/analytics/overview` (permission: `admin:access`)
- `GET /admin/archive/status` (permission: `admin:access`)
- `POST /admin/archive/run` (permission: `admin:access`)
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/{user_id}`
- `DELETE /admin/users/{user_id}`
- `GET /admin/candidates`
- `POST /admin/candidates`
- `PATCH /admin/candidates/{candidate_id}`
- `DELETE /admin/candidates/{candidate_id}`
- `GET /admin/companies`
- `POST /admin/companies`
- `PATCH /admin/companies/{company_id}`
- `DELETE /admin/companies/{company_id}`
- `GET /admin/jobs`
- `POST /admin/jobs`
- `PATCH /admin/jobs/{job_id}`
- `DELETE /admin/jobs/{job_id}`
- `GET /admin/blog-posts`
- `POST /admin/blog-posts`
- `PATCH /admin/blog-posts/{post_id}`
- `DELETE /admin/blog-posts/{post_id}`
- `GET /admin/tutorials`
- `POST /admin/tutorials`
- `PATCH /admin/tutorials/{tutorial_id}`
- `DELETE /admin/tutorials/{tutorial_id}`
- `POST /admin/companies/{company_id}/verify`

## Local run
```bash
cd apps/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
