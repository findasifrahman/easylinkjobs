# Database Layer (Prisma + PostgreSQL)

## Decision
We use **Prisma migrations** and **`prisma-client-py`**.

- Schema source: `apps/api/prisma/schema.prisma`
- Migration SQL is committed in `apps/api/prisma/migrations`
- FastAPI uses Prisma client in `app/core/db.py`

## ER overview

### Identity + RBAC (dynamic)
- `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
- Company-scoped authorization uses `user_roles.company_id`
- `company_members.role_id` links operational membership to RBAC role definitions

### Company
- `companies` with:
  - `company_type` (`CHINESE|WFOE|RO|FOREIGN_STARTUP|AGENCY|OTHER`)
  - `org_size`
  - `verification_status` (`UNVERIFIED|PENDING|VERIFIED|REJECTED`)
  - `verified_at`
- `company_verification_documents` with media-backed evidence docs

### Candidate
- `candidates` supports claimed and unclaimed profiles (`user_id` nullable)
- `candidate_claim_tokens`
- `candidate_profiles` + detailed child tables (education, experience, skills, languages, certifications, documents, passports, test scores)

### Job taxonomy (curated, translatable)
- `industries`
- `job_functions`
- `job_categories` (links industry + function)
- `taxonomy_translations` (`entity_type`, `entity_id`, `locale en/zh/bn`, localized name/description)
- `job_tags_catalog`
- `job_tags` (join table)

### Job posting (foreigner-friendly)
- `jobs` includes:
  - `foreigner_eligible`, `visa_sponsorship`, `work_permit_support`
  - `chinese_required_level`, `english_required`
  - `relocation_support`, `housing_provided`
  - `job_type`, `remote_policy`, `headcount`
  - `application_deadline`
  - `benefits` JSON, `screening_questions` JSON
  - source fields: `source`, `source_url`
  - premium gating: `contact_visibility_policy` (`PUBLIC|APPLICANTS_ONLY|PREMIUM_ONLY`)
- `job_language_requirements` (normalized language + level)
- `job_allowed_nationalities` (normalized)
- `job_locations`

### Applications + audit timeline
- `applications` includes status pipeline and `candidate_snapshot` JSON
- `application_events` timeline
- `application_notes`
- `applications_archive`

### Media
- `media_assets` stores R2 metadata only (`object_key`, mime, size, ACL/metadata JSON)

### Tracking + analytics
- `tracking_events`
- `tracking_events_archive`
- `analytics_daily_aggregates`

### Premium/freemium scaffolding
- `subscription_plans`, `subscription_plan_translations`
- `subscriptions`
- `entitlements`
- `plan_entitlements`
- `subscription_entitlements`
- `payment_customers`

## Entitlement check strategy (documented)
- Resolve active subscription for user/company scope.
- Expand included entitlements from `plan_entitlements`.
- Overlay runtime grants from `subscription_entitlements` (temporary promotions/manual grants).
- Endpoint policy checks entitlement codes (e.g., `job.contact.view_premium`).
- Cache effective entitlement set briefly in Redis and invalidate on subscription changes.

## Key indexes
### jobs
- `(created_at)`
- `(city, province)`
- `(visa_sponsorship)`
- `(foreigner_eligible)`
- `(remote_policy)`
- `(category_id)`

### applications
- `(job_id, created_at)`
- `(candidate_id, created_at)`
- `(status)`

### tracking_events
- `(created_at)`
- `(event_name, created_at)`
- `(utm_source, created_at)`

## Migration + generation
```bash
cd apps/api
pnpm prisma:validate
pnpm prisma:migrate:dev
pnpm prisma:generate
```

## Seed
```bash
cd apps/api
python -m scripts.seed_dev
```

Seed creates:
- super admin + RBAC roles/permissions
- company + job admin
- taxonomy sample + one direct job + one scraped job
- candidate + detailed profile + one application
