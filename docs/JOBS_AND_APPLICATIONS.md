# Jobs And Applications

## Scope
- Public jobs are readable without authentication through SSR-friendly list/detail pages.
- Company members create and manage jobs through RBAC-gated API endpoints.
- Candidates apply while authenticated; each submission stores a candidate snapshot for audit.
- Applicant contact details are intentionally redacted unless the reviewing company has an active contact-view entitlement.

## Job posting flow
1. Company user logs in and opens the company dashboard.
2. The dashboard posts to `POST /v1/jobs/`.
3. The API enforces `jobs:create`.
4. Published jobs become visible through `GET /v1/jobs/public` and `GET /v1/jobs/public/{job_id}`.

## Application flow
1. Candidate signs in and applies from the public job detail page.
2. The web client calls `POST /v1/applications/apply`.
3. The API upserts the application by `(job_id, candidate_id)`.
4. The API stores `candidate_snapshot` so later profile edits do not erase the original application context.
5. The API appends an `application_events` timeline row.

## Status pipeline
- `APPLIED`
- `VIEWED`
- `SHORTLISTED`
- `INTERVIEW`
- `OFFER`
- `HIRED`
- `REJECTED`
- `WITHDRAWN`

Company dashboard quick actions currently move candidates to:
- `SHORTLISTED`
- `REJECTED`

## Privacy rules
- Public visitors can browse jobs, but cannot apply without authentication.
- Applicant summary fields are safe-to-show recruiter fields:
  - name
  - nationality
  - top skills
  - years of experience
  - profile completion score
- Direct contact fields:
  - email
  - phone
- Direct contact is returned only when:
  - the company has an active subscription entitlement, or
  - the company has a paid unlock entitlement

If entitlement is missing, the API returns the applicant summary but redacts contact and sets a locked state for the UI.

## Entitlement strategy
- API service: `app/services/entitlements.py`
- Current check looks for an active company subscription and one of these entitlement codes:
  - `job.contact.view_premium`
  - `company.contact.unlock`
- The web UI treats contact as locked by default and only reveals it when the API says `can_view_contact = true`.

## Dashboard shape
- KPI cards:
  - views
  - applications
  - shortlisted
  - contact access state
- Applicant review:
  - status filter
  - shortlist action
  - reject action
  - side drawer for candidate summary and contact lock state

## Notes
- Job view analytics are currently based on `tracking_events` with `event_name = "view_job"`.
- The company overview endpoint currently counts view events globally; filtering to company-owned jobs is a reasonable next improvement.
