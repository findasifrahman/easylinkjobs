# easylinkjobs monorepo

Production-grade monorepo scaffold for a foreigner-friendly China job platform.

## Project goals
- Build a responsive, SEO-strong, multilingual job platform from day one.
- Enable dynamic RBAC with roles/permissions in DB (future roles without code changes).
- Keep data LLM-friendly with normalized schemas and structured JSON APIs.
- Deploy quickly on Railway now, with a clear path to premium cloud + clustering.

## User types
- `job_seeker`: candidate browsing/applying for jobs.
- `job_admin`: company recruiter/admin managing jobs and applicants.
- `super_admin`: platform owner/admin managing global settings, moderation, RBAC.

## Monorepo structure
- `apps/web`: Next.js App Router + Material UI frontend.
- `apps/api`: FastAPI backend.
- `packages/shared`: shared TypeScript types and Zod schemas.
- `infra`: local Docker Compose and helper scripts.
- `docs`: architecture, design system, runbooks, and strategy docs.

## Planned modules
- Auth and profile management.
- Job listings and detail pages.
- Company and recruiter management.
- Application workflow and status tracking.
- Admin moderation and reporting.
- Tracking and analytics (anonymous + authenticated).
- i18n content and SEO infrastructure.

## Local setup
### Prerequisites
- Node.js 20+
- pnpm 10+
- Python 3.11+
- Docker Desktop / Docker Engine

### 1) Install dependencies
```bash
pnpm install
```

```bash
cd apps/api
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate
pip install -e .[dev]
cd ../..
```

### 2) Start local infrastructure
```bash
cd infra
docker compose up -d
cd ..
```

### 3) Run web app
```bash
cd apps/web
pnpm dev
```

### 4) Run API app
```bash
cd apps/api
# activate venv first
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Optional shortcuts from repo root
```bash
make infra-up
make web-dev
make api-dev
```

## CI/CD overview
- CI workflow (`.github/workflows/ci.yml`) runs install, web lint/test placeholders, api lint/test placeholders, and prisma validate placeholder.
- Deploy workflow (`.github/workflows/deploy_railway.yml`) is a documented skeleton for Railway deployment.

## Deployment notes
- **Now (Railway):** Docker-first services for web/api with managed Postgres/Redis.
- **Later (premium cloud):** move to container orchestration (ECS/GKE/AKS/Kubernetes), managed Postgres with read replicas, Redis cluster, and object storage/CDN tuning.

## Important implementation constraints
- Theme tokens are centralized in web theme files (primary `#11CDDE`, accent `#FD7C6F`, surface white).
- i18n route prefixes are built-in: `/en`, `/zh`, `/bn`.
- DB schema is implemented with Prisma in `apps/api/prisma/schema.prisma`.
