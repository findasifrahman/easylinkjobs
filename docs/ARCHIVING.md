# Archiving

## Scope
Hot tables:
- `tracking_events`
- `applications`

Archive tables:
- `tracking_events_archive`
- `applications_archive`

Archive tables preserve the same business columns for replay and audit while keeping operational queries fast.

## Retention policy
- `tracking_events`: move rows older than 90 days
- `applications`: move final-status rows older than 180 days
- final application statuses:
  - `HIRED`
  - `REJECTED`
  - `WITHDRAWN`

## Runtime surfaces
- API:
  - `GET /v1/admin/archive/status`
  - `POST /v1/admin/archive/run`
- CLI:
```bash
cd apps/api
python -m scripts.run_archive --tracking-days 90 --application-days 180
```

## Batch move pattern
1. Insert eligible rows into the archive table with `ON CONFLICT DO NOTHING`.
2. Delete only rows inserted during the current run.
3. Re-check counts and run `ANALYZE` if the moved volume was high.

## Current implementation details
- The archive service lives in `app/services/archiving.py`.
- The service computes:
  - archive table counts
  - currently eligible tracking rows
  - currently eligible application rows
- The API returns those values so the admin dashboard can show archive pressure before and after each run.

## Local operation
- Recommended for development:
  - run manually before or after seed refreshes
  - verify results with `GET /v1/admin/archive/status`

## Production operation
- Recommended initial schedule: daily or weekly during off-peak hours.
- Reasonable schedulers:
  - cron
  - systemd timer
  - scheduled container job
  - CI scheduled workflow calling the admin API
- Example container scheduler manifest:
  - `apps/api/deploy/archive-cronjob.yaml`
- Keep one threshold source of truth. Prefer environment-backed scheduler config instead of duplicating values in multiple places.

## Indexes supporting archive jobs
- `tracking_events`: `(created_at)`, `(event_name, created_at)`, `(utm_source, created_at)`
- `applications`: `(job_id, created_at)`, `(candidate_id, created_at)`, `(status)`
- Keep equivalent indexes on archive tables if archive querying becomes frequent.

## Operational controls
- Process during off-peak windows.
- Keep archive jobs idempotent.
- Emit metrics:
  - moved row count
  - duration
  - failures
- Maintain a restore runbook:
  - `INSERT INTO hot_table SELECT ... FROM archive WHERE ...`
