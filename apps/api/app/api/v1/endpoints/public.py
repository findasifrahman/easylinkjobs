from fastapi import APIRouter, Query

from app.core.db import db
from app.core.responses import ok

router = APIRouter()


@router.get("/categories")
async def list_public_categories(locale: str = Query(default="EN")) -> dict:
    rows = await db.query_raw(
        """
        SELECT
          jc.id,
          jc.slug,
          COALESCE(tt.name, initcap(replace(jc.slug, '-', ' '))) AS name,
          count(j.id)::int AS job_count
        FROM job_categories jc
        LEFT JOIN taxonomy_translations tt
          ON tt.entity_type = 'CATEGORY'
         AND tt.entity_id = jc.id
         AND tt.locale::text = lower($1::text)
        LEFT JOIN jobs j
          ON j.category_id = jc.id
         AND j.is_published = true
         AND j.deleted_at IS NULL
         AND (j.application_deadline IS NULL OR j.application_deadline >= now())
        WHERE jc.is_active = true
        GROUP BY jc.id, jc.slug, tt.name
        ORDER BY job_count DESC, name ASC
        """,
        locale,
    )
    return ok(rows)


@router.get("/jobs")
async def list_public_jobs(
    category: str | None = Query(default=None),
    city: str | None = Query(default=None),
    visa_type: str | None = Query(default=None),
    visa_sponsorship: bool | None = Query(default=None),
    nationality: str | None = Query(default=None),
    source: str | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    resolved_visa_sponsorship = visa_sponsorship
    if resolved_visa_sponsorship is None and visa_type:
        normalized = visa_type.lower()
        resolved_visa_sponsorship = normalized not in {"none", "no", "not-sponsored"}

    total_rows = await db.query_raw(
        """
        SELECT count(*)::int AS total
        FROM jobs j
        LEFT JOIN companies c ON c.id = j.company_id
        LEFT JOIN job_categories jc ON jc.id = j.category_id
        WHERE j.is_published = true
          AND j.deleted_at IS NULL
          AND (j.application_deadline IS NULL OR j.application_deadline >= now())
          AND ($1::text IS NULL OR lower(jc.slug) = lower($1::text))
          AND ($2::text IS NULL OR lower(j.city) = lower($2::text))
          AND ($3::boolean IS NULL OR j.visa_sponsorship = $3::boolean)
          AND ($4::text IS NULL OR upper(j.source::text) = upper($4::text))
          AND (
            $5::text IS NULL
            OR lower(j.title) LIKE '%' || lower($5::text) || '%'
            OR lower(j.description) LIKE '%' || lower($5::text) || '%'
            OR lower(coalesce(c.name, '')) LIKE '%' || lower($5::text) || '%'
          )
          AND (
            $6::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM job_allowed_nationalities jan
              WHERE jan.job_id = j.id
                AND upper(jan.nationality_code) = upper($6::text)
            )
          )
        """,
        category,
        city,
        resolved_visa_sponsorship,
        source,
        q,
        nationality,
    )
    total = int(total_rows[0]["total"]) if total_rows else 0
    rows = await db.query_raw(
        """
        SELECT
          j.*,
          c.name AS company_name,
          c.slug AS company_slug,
          jc.slug AS category_slug
        FROM jobs j
        LEFT JOIN companies c ON c.id = j.company_id
        LEFT JOIN job_categories jc ON jc.id = j.category_id
        WHERE j.is_published = true
          AND j.deleted_at IS NULL
          AND (j.application_deadline IS NULL OR j.application_deadline >= now())
          AND ($1::text IS NULL OR lower(jc.slug) = lower($1::text))
          AND ($2::text IS NULL OR lower(j.city) = lower($2::text))
          AND ($3::boolean IS NULL OR j.visa_sponsorship = $3::boolean)
          AND ($4::text IS NULL OR upper(j.source::text) = upper($4::text))
          AND (
            $5::text IS NULL
            OR lower(j.title) LIKE '%' || lower($5::text) || '%'
            OR lower(j.description) LIKE '%' || lower($5::text) || '%'
            OR lower(coalesce(c.name, '')) LIKE '%' || lower($5::text) || '%'
          )
          AND (
            $6::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM job_allowed_nationalities jan
              WHERE jan.job_id = j.id
                AND upper(jan.nationality_code) = upper($6::text)
            )
          )
        ORDER BY j.created_at DESC
        LIMIT $7::int OFFSET $8::int
        """,
        category,
        city,
        resolved_visa_sponsorship,
        source,
        q,
        nationality,
        page_size,
        (page - 1) * page_size,
    )
    return ok(
        {
            "items": rows,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )
