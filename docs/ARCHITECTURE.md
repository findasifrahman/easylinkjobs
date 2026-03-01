# Architecture

## Current style
- Modular monolith across web + api apps.
- Strict module boundaries in API to avoid early spaghetti coupling.
- Shared contracts in `packages/shared` for schema-first frontend/backend evolution.

## Runtime components
- `apps/web` (Next.js App Router, SSR for public pages).
- `apps/api` (FastAPI JSON APIs).
- PostgreSQL (system of record).
- Redis (cache, queues/session primitives).
- Cloudflare R2 (object storage; local MinIO optional for development).

## Boundary rules
- Public read APIs separated from authenticated write APIs.
- RBAC checks are centralized in API authorization service.
- Tracking ingestion endpoint separated from product logic.
- Translation/content lookup isolated to i18n service layer.

## Scaling plan
1. Phase 1 (Railway): single web + api services, managed DB/Redis.
2. Phase 2: split heavy workloads (tracking ingestion, async jobs) into worker service.
3. Phase 3: add read replicas, Redis clustering, CDN hardening, and horizontal API scaling.
4. Phase 4: transition to orchestrated cloud environment with blue/green deploys.

## Portability principles
- Docker-first runtime.
- 12-factor env-based config.
- No provider lock in core business logic.
