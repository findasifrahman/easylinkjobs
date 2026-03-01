from dataclasses import asdict, dataclass

from app.core.db import db

FINAL_APPLICATION_STATUSES = ("HIRED", "REJECTED", "WITHDRAWN")


@dataclass
class ArchiveStatus:
    tracking_archive_count: int
    application_archive_count: int
    eligible_tracking_count: int
    eligible_application_count: int
    tracking_days: int
    application_days: int


async def get_archive_status(tracking_days: int = 90, application_days: int = 180) -> ArchiveStatus:
    tracking_archive_rows = await db.query_raw("SELECT count(*)::int AS c FROM tracking_events_archive")
    application_archive_rows = await db.query_raw("SELECT count(*)::int AS c FROM applications_archive")
    eligible_tracking_rows = await db.query_raw(
        """
        SELECT count(*)::int AS c
        FROM tracking_events
        WHERE created_at < now() - make_interval(days => $1::int)
        """,
        tracking_days,
    )
    eligible_application_rows = await db.query_raw(
        """
        SELECT count(*)::int AS c
        FROM applications
        WHERE created_at < now() - make_interval(days => $1::int)
          AND status = ANY($2::"ApplicationStatus"[])
        """,
        application_days,
        list(FINAL_APPLICATION_STATUSES),
    )
    return ArchiveStatus(
        tracking_archive_count=int(tracking_archive_rows[0]["c"]) if tracking_archive_rows else 0,
        application_archive_count=int(application_archive_rows[0]["c"]) if application_archive_rows else 0,
        eligible_tracking_count=int(eligible_tracking_rows[0]["c"]) if eligible_tracking_rows else 0,
        eligible_application_count=int(eligible_application_rows[0]["c"]) if eligible_application_rows else 0,
        tracking_days=tracking_days,
        application_days=application_days,
    )


async def run_archive(tracking_days: int = 90, application_days: int = 180) -> dict[str, int]:
    tracking_rows = await db.query_raw(
        """
        WITH moved AS (
          INSERT INTO tracking_events_archive (
            id, event_name, session_id, anonymous_id, user_id,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content,
            referrer, page_url, properties, created_at, deleted_at
          )
          SELECT
            id, event_name, session_id, anonymous_id, user_id,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content,
            referrer, page_url, properties, created_at, deleted_at
          FROM tracking_events
          WHERE created_at < now() - make_interval(days => $1::int)
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        ),
        deleted AS (
          DELETE FROM tracking_events
          WHERE id IN (SELECT id FROM moved)
          RETURNING id
        )
        SELECT count(*)::int AS moved_count FROM deleted
        """,
        tracking_days,
    )
    application_rows = await db.query_raw(
        """
        WITH moved AS (
          INSERT INTO applications_archive (
            id, job_id, candidate_id, status, candidate_snapshot, cover_letter,
            screening_answers, applied_at, created_at, updated_at, deleted_at
          )
          SELECT
            id, job_id, candidate_id, status, candidate_snapshot, cover_letter,
            screening_answers, applied_at, created_at, updated_at, deleted_at
          FROM applications
          WHERE created_at < now() - make_interval(days => $1::int)
            AND status = ANY($2::"ApplicationStatus"[])
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        ),
        deleted AS (
          DELETE FROM applications
          WHERE id IN (SELECT id FROM moved)
          RETURNING id
        )
        SELECT count(*)::int AS moved_count FROM deleted
        """,
        application_days,
        list(FINAL_APPLICATION_STATUSES),
    )
    status = await get_archive_status(tracking_days=tracking_days, application_days=application_days)
    return {
        "tracking_events_archived": int(tracking_rows[0]["moved_count"]) if tracking_rows else 0,
        "applications_archived": int(application_rows[0]["moved_count"]) if application_rows else 0,
        **asdict(status),
    }
