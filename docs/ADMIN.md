# Admin

## Access model
- All `/v1/admin/...` endpoints are protected by the dynamic RBAC permission `admin:access`.
- This keeps the super admin surface data-driven. New admin roles can be introduced in DB without code changes.

## Capabilities
- Analytics:
  - daily time series for visits, signups, applies, and job posts
  - top `utm_source` values
  - conversion funnel summary
- CRUD:
  - users
  - candidates
  - companies
  - jobs
- Candidate cold-start import:
  - create unclaimed profiles manually
  - optionally create a linked user during import
- Company verification:
  - mark companies as verified from the admin surface
- Archiving:
  - inspect archive eligibility and totals
  - trigger a manual archive run

## Dashboard structure
- Top metrics summarize visits, signups, applies, and job posts.
- Charts:
  - line chart for time series
  - bar chart for top traffic sources
- Tables:
  - `MUI DataGrid` for users, candidates, companies, and jobs
- Quick actions:
  - create user
  - import candidate
  - create company
  - create job
  - run archive

## Notes
- Candidate imports default to `UNCLAIMED` unless explicitly linked to a user.
- Archive operations move rows into archive tables first, then delete moved rows from active tables.
