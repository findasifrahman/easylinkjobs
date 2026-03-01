from datetime import UTC, datetime, timedelta
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from prisma import Json
from pydantic import BaseModel, EmailStr

from app.core.authz import require_permission
from app.core.db import db
from app.core.responses import ok
from app.core.security import hash_password, validate_password_strength
from app.services.archiving import get_archive_status, run_archive
from app.services.candidate_profile import refresh_profile_completion

router = APIRouter(dependencies=[Depends(require_permission("admin:access"))])


class UserAdminIn(BaseModel):
    email: EmailStr
    password_hash: str | None = None
    status: str = "ACTIVE"
    role_key: str | None = None


class CandidateAdminIn(BaseModel):
    user_id: str | None = None
    email: EmailStr | None = None
    password_hash: str = "admin_import"
    status: str = "UNCLAIMED"
    source: str = "admin_import"
    full_name: str
    nationality: str | None = None
    current_country: str | None = None
    current_city: str | None = None
    phone: str | None = None
    profile_email: EmailStr | None = None


class CompanyAdminIn(BaseModel):
    name: str
    slug: str
    company_type: str = "OTHER"
    org_size: str = "SMALL"
    website: str | None = None
    description: str | None = None
    city: str | None = None
    province: str | None = None
    country: str | None = None
    verification_status: str = "UNVERIFIED"


class JobAdminIn(BaseModel):
    company_id: str
    category_id: str | None = None
    title: str
    description: str
    city: str
    province: str | None = None
    country: str
    salary_min: int | None = None
    salary_max: int | None = None
    visa_sponsorship: bool = False
    foreigner_eligible: bool = True
    remote_policy: str = "ONSITE"
    job_type: str = "FULL_TIME"
    source: str = "DIRECT"
    source_url: str | None = None
    work_permit_support: bool = False
    english_required: bool = True
    relocation_support: bool = False
    housing_provided: bool = False
    headcount: int | None = None
    benefits: dict | None = None
    screening_questions: dict | None = None
    is_published: bool = False


class ArchiveRunIn(BaseModel):
    tracking_days: int = 90
    application_days: int = 180


class BlogPostAdminIn(BaseModel):
    slug: str
    language_code: str = "en"
    title: str
    excerpt: str | None = None
    content: str
    is_published: bool = False


class TutorialAdminIn(BaseModel):
    slug: str
    language_code: str = "en"
    title: str
    summary: str | None = None
    content: str
    is_published: bool = False


class PremiumGrantIn(BaseModel):
    plan_code: str = "premium_company"
    duration_days: int = 30
    status: str = "ACTIVE"
    provider: str = "manual_admin"
    external_ref: str | None = None


class CompanyEntitlementGrantIn(BaseModel):
    entitlement_code: str = "company.contact.unlock"
    duration_days: int = 30


class TaxonomyCategoryAdminIn(BaseModel):
    name: str
    slug: str
    locale: str = "EN"
    industry_id: str | None = None
    job_function_id: str | None = None
    is_active: bool = True
    description: str | None = None


class TaxonomyRootAdminIn(BaseModel):
    name: str
    slug: str
    locale: str = "EN"
    is_active: bool = True
    description: str | None = None


def _verified_at(value: str) -> datetime | None:
    if value == "VERIFIED":
        return datetime.now(UTC)
    return None


def _sanitize_markdown(value: str) -> str:
    cleaned = re.sub(r"<script.*?>.*?</script>", "", value, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"javascript:", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def _paginate(items: list[dict], total: int, page: int, page_size: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def _ensure_unique_slug(model_name: str, slug: str, current_id: str | None = None) -> None:
    normalized_slug = slug.strip().lower()
    existing = None
    if model_name == "category":
        existing = await db.jobcategory.find_unique(where={"slug": normalized_slug})
    elif model_name == "industry":
        existing = await db.industry.find_unique(where={"slug": normalized_slug})
    elif model_name == "job_function":
        existing = await db.jobfunction.find_unique(where={"slug": normalized_slug})
    if existing is not None and existing.id != current_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"The slug '{normalized_slug}' is already in use.",
        )


async def _resolve_default_taxonomy_roots() -> tuple[str, str]:
    industry = await db.industry.find_first(where={"isActive": True}, order={"createdAt": "asc"})
    if industry is None:
        industry = await db.industry.create(data={"slug": "general", "isActive": True})
        await db.taxonomytranslation.create(
            data={
                "entityType": "INDUSTRY",
                "entityId": industry.id,
                "locale": "EN",
                "name": "General",
                "description": "Default industry root created automatically.",
            }
        )

    job_function = await db.jobfunction.find_first(where={"isActive": True}, order={"createdAt": "asc"})
    if job_function is None:
        job_function = await db.jobfunction.create(data={"slug": "general", "isActive": True})
        await db.taxonomytranslation.create(
            data={
                "entityType": "FUNCTION",
                "entityId": job_function.id,
                "locale": "EN",
                "name": "General",
                "description": "Default job function root created automatically.",
            }
        )

    return industry.id, job_function.id


@router.get("/analytics/overview")
async def analytics_overview(days: int = Query(default=14, ge=7, le=90)) -> dict:
    query = """
    WITH days AS (
      SELECT generate_series((current_date - make_interval(days => $1::int - 1))::date, current_date::date, interval '1 day')::date AS d
    ),
    visits AS (
      SELECT date(created_at) AS d, count(*) AS c FROM tracking_events
      WHERE event_name = 'page_view' AND created_at >= current_date - make_interval(days => $1::int - 1)
      GROUP BY 1
    ),
    signups AS (
      SELECT date(created_at) AS d, count(*) AS c FROM users
      WHERE created_at >= current_date - make_interval(days => $1::int - 1)
      GROUP BY 1
    ),
    applies AS (
      SELECT date(created_at) AS d, count(*) AS c FROM applications
      WHERE created_at >= current_date - make_interval(days => $1::int - 1)
      GROUP BY 1
    ),
    jobs AS (
      SELECT date(created_at) AS d, count(*) AS c FROM jobs
      WHERE created_at >= current_date - make_interval(days => $1::int - 1)
      GROUP BY 1
    )
    SELECT to_char(days.d, 'YYYY-MM-DD') AS day,
           COALESCE(visits.c, 0) AS visits,
           COALESCE(signups.c, 0) AS signups,
           COALESCE(applies.c, 0) AS applies,
           COALESCE(jobs.c, 0) AS job_posts
    FROM days
    LEFT JOIN visits ON visits.d = days.d
    LEFT JOIN signups ON signups.d = days.d
    LEFT JOIN applies ON applies.d = days.d
    LEFT JOIN jobs ON jobs.d = days.d
    ORDER BY day;
    """
    series = await db.query_raw(query, days)
    top_sources = await db.query_raw(
        """
        SELECT COALESCE(utm_source, '(direct)') AS source, count(*)::int AS count
        FROM tracking_events
        WHERE created_at >= current_date - make_interval(days => $1::int - 1)
        GROUP BY 1
        ORDER BY count DESC, source ASC
        LIMIT 8
        """,
        days,
    )
    totals = {
        "visits": sum(int(x["visits"]) for x in series),
        "signups": sum(int(x["signups"]) for x in series),
        "applies": sum(int(x["applies"]) for x in series),
        "job_posts": sum(int(x["job_posts"]) for x in series),
    }
    funnel = {
        "visits": totals["visits"],
        "signups": totals["signups"],
        "applies": totals["applies"],
        "signup_rate": round((totals["signups"] / totals["visits"]) * 100, 2) if totals["visits"] else 0,
        "apply_rate": round((totals["applies"] / totals["visits"]) * 100, 2) if totals["visits"] else 0,
        "signup_to_apply_rate": round((totals["applies"] / totals["signups"]) * 100, 2) if totals["signups"] else 0,
    }
    archive_status = await get_archive_status()
    return ok(
        {
            "series": series,
            "totals": totals,
            "top_sources": top_sources,
            "funnel": funnel,
            "archive_status": archive_status.__dict__,
        }
    )


@router.get("/tracking-events")
async def admin_list_tracking_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    where = {"deletedAt": None}
    total = await db.trackingevent.count(where=where)
    items = await db.trackingevent.find_many(
        where=where,
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )
    return ok(_paginate([item.model_dump(mode="json") for item in items], total, page, page_size))


@router.get("/taxonomy/categories")
async def admin_list_taxonomy_categories(
    locale: str = Query(default="EN"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    total_rows = await db.query_raw("SELECT count(*)::int AS total FROM job_categories")
    total = int(total_rows[0]["total"]) if total_rows else 0
    rows = await db.query_raw(
        """
        SELECT
          jc.id,
          jc.slug,
          jc.is_active AS "isActive",
          COALESCE(tt.name, initcap(replace(jc.slug, '-', ' '))) AS name,
          i.slug AS industry_slug,
          jf.slug AS function_slug,
          count(j.id)::int AS job_count
        FROM job_categories jc
        LEFT JOIN taxonomy_translations tt
          ON tt.entity_type = 'CATEGORY'
         AND tt.entity_id = jc.id
         AND tt.locale::text = lower($1::text)
        LEFT JOIN industries i ON i.id = jc.industry_id
        LEFT JOIN job_functions jf ON jf.id = jc.job_function_id
        LEFT JOIN jobs j
          ON j.category_id = jc.id
         AND j.deleted_at IS NULL
         AND j.is_published = true
         AND (j.application_deadline IS NULL OR j.application_deadline >= now())
        GROUP BY jc.id, jc.slug, jc.is_active, tt.name, i.slug, jf.slug
        ORDER BY name ASC
        LIMIT $2::int OFFSET $3::int
        """,
        locale,
        page_size,
        (page - 1) * page_size,
    )
    return ok(_paginate(rows, total, page, page_size))


@router.get("/taxonomy/industries")
async def admin_list_taxonomy_industries(locale: str = Query(default="EN")) -> dict:
    rows = await db.query_raw(
        """
        SELECT
          i.id,
          i.slug,
          i.is_active AS "isActive",
          COALESCE(tt.name, initcap(replace(i.slug, '-', ' '))) AS name
        FROM industries i
        LEFT JOIN taxonomy_translations tt
          ON tt.entity_type = 'INDUSTRY'
         AND tt.entity_id = i.id
         AND tt.locale::text = lower($1::text)
        ORDER BY name ASC
        """,
        locale,
    )
    return ok(rows)


@router.get("/taxonomy/job-functions")
async def admin_list_taxonomy_job_functions(locale: str = Query(default="EN")) -> dict:
    rows = await db.query_raw(
        """
        SELECT
          jf.id,
          jf.slug,
          jf.is_active AS "isActive",
          COALESCE(tt.name, initcap(replace(jf.slug, '-', ' '))) AS name
        FROM job_functions jf
        LEFT JOIN taxonomy_translations tt
          ON tt.entity_type = 'FUNCTION'
         AND tt.entity_id = jf.id
         AND tt.locale::text = lower($1::text)
        ORDER BY name ASC
        """,
        locale,
    )
    return ok(rows)


@router.post("/taxonomy/categories")
async def admin_create_taxonomy_category(payload: TaxonomyCategoryAdminIn) -> dict:
    locale = payload.locale.upper()
    await _ensure_unique_slug("category", payload.slug)
    industry_id = payload.industry_id
    job_function_id = payload.job_function_id
    if industry_id is None or job_function_id is None:
        fallback_industry_id, fallback_job_function_id = await _resolve_default_taxonomy_roots()
        industry_id = industry_id or fallback_industry_id
        job_function_id = job_function_id or fallback_job_function_id

    category = await db.jobcategory.create(
        data={
            "slug": payload.slug.strip().lower(),
            "isActive": payload.is_active,
            "industry": {"connect": {"id": industry_id}},
            "jobFunction": {"connect": {"id": job_function_id}},
        }
    )
    await db.taxonomytranslation.upsert(
        where={
            "entityType_entityId_locale": {
                "entityType": "CATEGORY",
                "entityId": category.id,
                "locale": locale,
            }
        },
        data={
            "create": {
                "entityType": "CATEGORY",
                "entityId": category.id,
                "locale": locale,
                "name": payload.name.strip(),
                "description": payload.description,
            },
            "update": {
                "name": payload.name.strip(),
                "description": payload.description,
            },
        },
    )
    rows = await db.query_raw(
        """
        SELECT
          jc.id,
          jc.slug,
          jc.is_active AS "isActive",
          COALESCE(tt.name, initcap(replace(jc.slug, '-', ' '))) AS name,
          i.slug AS industry_slug,
          jf.slug AS function_slug,
          0::int AS job_count
        FROM job_categories jc
        LEFT JOIN taxonomy_translations tt
          ON tt.entity_type = 'CATEGORY'
         AND tt.entity_id = jc.id
         AND tt.locale::text = lower($1::text)
        LEFT JOIN industries i ON i.id = jc.industry_id
        LEFT JOIN job_functions jf ON jf.id = jc.job_function_id
        WHERE jc.id = $2::uuid
        """,
        locale,
        category.id,
    )
    return ok(rows[0] if rows else {"id": category.id, "slug": category.slug})


@router.patch("/taxonomy/categories/{category_id}")
async def admin_update_taxonomy_category(category_id: str, payload: TaxonomyCategoryAdminIn) -> dict:
    locale = payload.locale.upper()
    await _ensure_unique_slug("category", payload.slug, category_id)
    existing = await db.jobcategory.find_unique(where={"id": category_id})
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    category = await db.jobcategory.update(
        where={"id": category_id},
        data={
            "slug": payload.slug.strip().lower(),
            "isActive": payload.is_active,
            "industry": {"connect": {"id": payload.industry_id or existing.industryId}},
            "jobFunction": {"connect": {"id": payload.job_function_id or existing.jobFunctionId}},
        },
    )
    await db.taxonomytranslation.upsert(
        where={
            "entityType_entityId_locale": {
                "entityType": "CATEGORY",
                "entityId": category.id,
                "locale": locale,
            }
        },
        data={
            "create": {
                "entityType": "CATEGORY",
                "entityId": category.id,
                "locale": locale,
                "name": payload.name.strip(),
                "description": payload.description,
            },
            "update": {
                "name": payload.name.strip(),
                "description": payload.description,
            },
        },
    )
    rows = await db.query_raw(
        """
        SELECT
          jc.id,
          jc.slug,
          jc.is_active AS "isActive",
          COALESCE(tt.name, initcap(replace(jc.slug, '-', ' '))) AS name,
          i.slug AS industry_slug,
          jf.slug AS function_slug,
          count(j.id)::int AS job_count
        FROM job_categories jc
        LEFT JOIN taxonomy_translations tt
          ON tt.entity_type = 'CATEGORY'
         AND tt.entity_id = jc.id
         AND tt.locale::text = lower($1::text)
        LEFT JOIN industries i ON i.id = jc.industry_id
        LEFT JOIN job_functions jf ON jf.id = jc.job_function_id
        LEFT JOIN jobs j
          ON j.category_id = jc.id
         AND j.deleted_at IS NULL
         AND j.is_published = true
         AND (j.application_deadline IS NULL OR j.application_deadline >= now())
        WHERE jc.id = $2::uuid
        GROUP BY jc.id, jc.slug, jc.is_active, tt.name, i.slug, jf.slug
        """,
        locale,
        category.id,
    )
    return ok(rows[0] if rows else {"id": category.id, "slug": category.slug})


@router.delete("/taxonomy/categories/{category_id}")
async def admin_delete_taxonomy_category(category_id: str) -> dict:
    active_jobs = await db.job.count(where={"categoryId": category_id, "deletedAt": None})
    if active_jobs > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category is still linked to jobs. Move those jobs first.",
        )
    await db.taxonomytranslation.delete_many(where={"entityType": "CATEGORY", "entityId": category_id})
    await db.jobcategory.delete(where={"id": category_id})
    return ok({"deleted": True, "category_id": category_id})


@router.post("/taxonomy/industries")
async def admin_create_taxonomy_industry(payload: TaxonomyRootAdminIn) -> dict:
    locale = payload.locale.upper()
    await _ensure_unique_slug("industry", payload.slug)
    industry = await db.industry.create(
        data={
            "slug": payload.slug.strip().lower(),
            "isActive": payload.is_active,
        }
    )
    await db.taxonomytranslation.create(
        data={
            "entityType": "INDUSTRY",
            "entityId": industry.id,
            "locale": locale,
            "name": payload.name.strip(),
            "description": payload.description,
        }
    )
    return ok({"id": industry.id, "slug": industry.slug, "isActive": industry.isActive, "name": payload.name.strip()})


@router.post("/taxonomy/job-functions")
async def admin_create_taxonomy_job_function(payload: TaxonomyRootAdminIn) -> dict:
    locale = payload.locale.upper()
    await _ensure_unique_slug("job_function", payload.slug)
    job_function = await db.jobfunction.create(
        data={
            "slug": payload.slug.strip().lower(),
            "isActive": payload.is_active,
        }
    )
    await db.taxonomytranslation.create(
        data={
            "entityType": "FUNCTION",
            "entityId": job_function.id,
            "locale": locale,
            "name": payload.name.strip(),
            "description": payload.description,
        }
    )
    return ok(
        {
            "id": job_function.id,
            "slug": job_function.slug,
            "isActive": job_function.isActive,
            "name": payload.name.strip(),
        }
    )


@router.get("/archive/status")
async def archive_status(
    tracking_days: int = Query(default=90, ge=7, le=3650),
    application_days: int = Query(default=180, ge=30, le=3650),
) -> dict:
    status_payload = await get_archive_status(tracking_days=tracking_days, application_days=application_days)
    return ok(status_payload.__dict__)


@router.post("/archive/run")
async def archive_run(payload: ArchiveRunIn) -> dict:
    result = await run_archive(tracking_days=payload.tracking_days, application_days=payload.application_days)
    return ok(result)


@router.get("/users")
async def admin_list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    where = {"deletedAt": None}
    total = await db.user.count(where=where)
    users = await db.user.find_many(
        where=where,
        include={"userRoles": {"include": {"role": True}}},
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )
    items = []
    for user in users:
        payload = user.model_dump(mode="json")
        global_roles = [row.role.key for row in user.userRoles if row.companyId is None and row.role is not None]
        payload["role_key"] = global_roles[0] if global_roles else None
        payload["role_keys"] = global_roles
        items.append(payload)
    return ok(_paginate(items, total, page, page_size))


@router.post("/users")
async def admin_create_user(payload: UserAdminIn) -> dict:
    if not payload.password_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required")
    validate_password_strength(payload.password_hash)
    user = await db.user.create(
        data={
            "email": payload.email,
            "passwordHash": hash_password(payload.password_hash),
            "status": payload.status,
        }
    )
    if payload.role_key:
        role = await db.role.find_unique(where={"key": payload.role_key})
        if role is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found")
        existing = await db.userrole.find_first(
            where={"userId": user.id, "roleId": role.id, "companyId": None}
        )
        if existing is None:
            await db.userrole.create(
                data={
                    "user": {"connect": {"id": user.id}},
                    "role": {"connect": {"id": role.id}},
                }
            )
    return ok(user.model_dump(mode="json"))


@router.patch("/users/{user_id}")
async def admin_update_user(user_id: str, payload: UserAdminIn) -> dict:
    user_data: dict[str, object] = {
        "email": payload.email,
        "status": payload.status,
    }
    if payload.password_hash:
        validate_password_strength(payload.password_hash)
        user_data["passwordHash"] = hash_password(payload.password_hash)
    user = await db.user.update(
        where={"id": user_id},
        data=user_data,
    )
    if payload.role_key:
        role = await db.role.find_unique(where={"key": payload.role_key})
        if role is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found")
        global_roles = await db.userrole.find_many(where={"userId": user_id, "companyId": None})
        for row in global_roles:
            if row.roleId != role.id:
                await db.userrole.delete(where={"id": row.id})
        existing = await db.userrole.find_first(
            where={"userId": user.id, "roleId": role.id, "companyId": None}
        )
        if existing is None:
            await db.userrole.create(
                data={
                    "user": {"connect": {"id": user.id}},
                    "role": {"connect": {"id": role.id}},
                }
            )
    return ok(user.model_dump(mode="json"))


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str) -> dict:
    await db.user.update(where={"id": user_id}, data={"deletedAt": datetime.now(UTC)})
    return ok({"deleted": True, "user_id": user_id})


@router.get("/candidates")
async def admin_list_candidates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    where = {"deletedAt": None}
    total = await db.candidate.count(where=where)
    candidates = await db.candidate.find_many(
        where=where,
        include={"profile": True},
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )
    return ok(_paginate([candidate.model_dump(mode="json") for candidate in candidates], total, page, page_size))


@router.post("/candidates")
async def admin_create_candidate(payload: CandidateAdminIn) -> dict:
    user_id = payload.user_id
    if user_id is None and payload.email is not None:
        user = await db.user.create(
            data={
                "email": payload.email,
                "passwordHash": payload.password_hash,
                "status": "ACTIVE",
            }
        )
        user_id = user.id
    candidate_data: dict[str, object] = {
        "status": payload.status,
        "source": payload.source,
        "metadata": Json({"created_by": "admin"}),
        "profile": {
            "create": {
                "fullName": payload.full_name,
                "nationality": payload.nationality,
                "currentCountry": payload.current_country,
                "currentCity": payload.current_city,
                "phone": payload.phone,
                "email": payload.profile_email or payload.email,
            }
        },
    }
    if user_id is not None:
        candidate_data["user"] = {"connect": {"id": user_id}}
    candidate = await db.candidate.create(data=candidate_data, include={"profile": True})
    await refresh_profile_completion(candidate.id)
    refreshed = await db.candidate.find_unique(where={"id": candidate.id}, include={"profile": True})
    return ok(refreshed.model_dump(mode="json") if refreshed else candidate.model_dump(mode="json"))


@router.patch("/candidates/{candidate_id}")
async def admin_update_candidate(candidate_id: str, payload: CandidateAdminIn) -> dict:
    candidate = await db.candidate.update(
        where={"id": candidate_id},
        data={
            "status": payload.status,
            "source": payload.source,
        },
    )
    profile = await db.candidateprofile.find_unique(where={"candidateId": candidate_id})
    if profile is None:
        await db.candidateprofile.create(
            data={
                "candidate": {"connect": {"id": candidate_id}},
                "fullName": payload.full_name,
                "nationality": payload.nationality,
                "currentCountry": payload.current_country,
                "currentCity": payload.current_city,
                "phone": payload.phone,
                "email": payload.profile_email or payload.email,
            }
        )
    else:
        await db.candidateprofile.update(
            where={"id": profile.id},
            data={
                "fullName": payload.full_name,
                "nationality": payload.nationality,
                "currentCountry": payload.current_country,
                "currentCity": payload.current_city,
                "phone": payload.phone,
                "email": payload.profile_email or payload.email,
            },
        )
    await refresh_profile_completion(candidate_id)
    refreshed = await db.candidate.find_unique(where={"id": candidate.id}, include={"profile": True})
    return ok(refreshed.model_dump(mode="json") if refreshed else candidate.model_dump(mode="json"))


@router.delete("/candidates/{candidate_id}")
async def admin_delete_candidate(candidate_id: str) -> dict:
    await db.candidate.update(where={"id": candidate_id}, data={"deletedAt": datetime.now(UTC)})
    return ok({"deleted": True, "candidate_id": candidate_id})


@router.get("/companies")
async def admin_list_companies(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    where = {"deletedAt": None}
    total = await db.company.count(where=where)
    companies = await db.company.find_many(
        where=where, order={"createdAt": "desc"}, skip=(page - 1) * page_size, take=page_size
    )
    return ok(_paginate([company.model_dump(mode="json") for company in companies], total, page, page_size))


@router.post("/companies")
async def admin_create_company(payload: CompanyAdminIn) -> dict:
    company = await db.company.create(
        data={
            "name": payload.name,
            "slug": payload.slug,
            "companyType": payload.company_type,
            "orgSize": payload.org_size,
            "website": payload.website,
            "description": payload.description,
            "city": payload.city,
            "province": payload.province,
            "country": payload.country,
            "verificationStatus": payload.verification_status,
            "verifiedAt": _verified_at(payload.verification_status),
        }
    )
    return ok(company.model_dump(mode="json"))


@router.patch("/companies/{company_id}")
async def admin_update_company(company_id: str, payload: CompanyAdminIn) -> dict:
    company = await db.company.update(
        where={"id": company_id},
        data={
            "name": payload.name,
            "slug": payload.slug,
            "companyType": payload.company_type,
            "orgSize": payload.org_size,
            "website": payload.website,
            "description": payload.description,
            "city": payload.city,
            "province": payload.province,
            "country": payload.country,
            "verificationStatus": payload.verification_status,
            "verifiedAt": _verified_at(payload.verification_status),
        },
    )
    return ok(company.model_dump(mode="json"))


@router.delete("/companies/{company_id}")
async def admin_delete_company(company_id: str) -> dict:
    await db.company.update(where={"id": company_id}, data={"deletedAt": datetime.now(UTC)})
    return ok({"deleted": True, "company_id": company_id})


@router.post("/companies/{company_id}/verify")
async def verify_company(company_id: str) -> dict:
    company = await db.company.update(
        where={"id": company_id},
        data={"verificationStatus": "VERIFIED", "verifiedAt": datetime.now(UTC)},
    )
    return ok({"company_id": company.id, "verification_status": company.verificationStatus})


@router.get("/jobs")
async def admin_list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    where = {"deletedAt": None}
    total = await db.job.count(where=where)
    jobs = await db.job.find_many(
        where=where,
        include={"company": True},
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )
    return ok(_paginate([job.model_dump(mode="json") for job in jobs], total, page, page_size))


@router.post("/jobs")
async def admin_create_job(payload: JobAdminIn) -> dict:
    data: dict[str, object] = {
        "company": {"connect": {"id": payload.company_id}},
        "title": payload.title,
        "description": payload.description,
        "city": payload.city,
        "province": payload.province,
        "country": payload.country,
        "salaryMin": payload.salary_min,
        "salaryMax": payload.salary_max,
        "visaSponsorship": payload.visa_sponsorship,
        "foreignerEligible": payload.foreigner_eligible,
        "remotePolicy": payload.remote_policy,
        "jobType": payload.job_type,
        "source": payload.source,
        "sourceUrl": payload.source_url,
        "workPermitSupport": payload.work_permit_support,
        "englishRequired": payload.english_required,
        "relocationSupport": payload.relocation_support,
        "housingProvided": payload.housing_provided,
        "headcount": payload.headcount,
        "benefits": Json(payload.benefits) if payload.benefits is not None else None,
        "screeningQuestions": Json(payload.screening_questions) if payload.screening_questions is not None else None,
        "isPublished": payload.is_published,
    }
    if payload.category_id:
        data["category"] = {"connect": {"id": payload.category_id}}
    job = await db.job.create(data=data)
    return ok(job.model_dump(mode="json"))


@router.patch("/jobs/{job_id}")
async def admin_update_job(job_id: str, payload: JobAdminIn) -> dict:
    data: dict[str, object] = {
        "company": {"connect": {"id": payload.company_id}},
        "title": payload.title,
        "description": payload.description,
        "city": payload.city,
        "province": payload.province,
        "country": payload.country,
        "salaryMin": payload.salary_min,
        "salaryMax": payload.salary_max,
        "visaSponsorship": payload.visa_sponsorship,
        "foreignerEligible": payload.foreigner_eligible,
        "remotePolicy": payload.remote_policy,
        "jobType": payload.job_type,
        "source": payload.source,
        "sourceUrl": payload.source_url,
        "workPermitSupport": payload.work_permit_support,
        "englishRequired": payload.english_required,
        "relocationSupport": payload.relocation_support,
        "housingProvided": payload.housing_provided,
        "headcount": payload.headcount,
        "benefits": Json(payload.benefits) if payload.benefits is not None else None,
        "screeningQuestions": Json(payload.screening_questions) if payload.screening_questions is not None else None,
        "isPublished": payload.is_published,
        "category": {"connect": {"id": payload.category_id}} if payload.category_id else {"disconnect": True},
    }
    job = await db.job.update(
        where={"id": job_id},
        data=data,
    )
    return ok(job.model_dump(mode="json"))


@router.post("/jobs/{job_id}/approve")
async def admin_approve_job(job_id: str) -> dict:
    now = datetime.now(UTC)
    job = await db.job.update(
        where={"id": job_id},
        data={"isPublished": True, "publishedAt": now},
    )
    return ok({"job_id": job.id, "moderation_status": "APPROVED", "is_published": job.isPublished})


@router.post("/jobs/{job_id}/reject")
async def admin_reject_job(job_id: str) -> dict:
    job = await db.job.update(
        where={"id": job_id},
        data={"isPublished": False, "publishedAt": None},
    )
    return ok({"job_id": job.id, "moderation_status": "REJECTED", "is_published": job.isPublished})


@router.delete("/jobs/{job_id}")
async def admin_delete_job(job_id: str) -> dict:
    await db.job.update(where={"id": job_id}, data={"deletedAt": datetime.now(UTC)})
    return ok({"deleted": True, "job_id": job_id})


@router.get("/blog-posts")
async def admin_list_blog_posts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    where = {"deletedAt": None}
    total = await db.blogpost.count(where=where)
    items = await db.blogpost.find_many(
        where=where, order={"createdAt": "desc"}, skip=(page - 1) * page_size, take=page_size
    )
    return ok(_paginate([item.model_dump(mode="json") for item in items], total, page, page_size))


@router.post("/blog-posts")
async def admin_create_blog_post(payload: BlogPostAdminIn) -> dict:
    item = await db.blogpost.create(
        data={
            "slug": payload.slug,
            "languageCode": payload.language_code,
            "title": payload.title,
            "excerpt": payload.excerpt,
            "content": _sanitize_markdown(payload.content),
            "isPublished": payload.is_published,
            "publishedAt": datetime.now(UTC) if payload.is_published else None,
        }
    )
    return ok(item.model_dump(mode="json"))


@router.patch("/blog-posts/{post_id}")
async def admin_update_blog_post(post_id: str, payload: BlogPostAdminIn) -> dict:
    item = await db.blogpost.update(
        where={"id": post_id},
        data={
            "slug": payload.slug,
            "languageCode": payload.language_code,
            "title": payload.title,
            "excerpt": payload.excerpt,
            "content": _sanitize_markdown(payload.content),
            "isPublished": payload.is_published,
            "publishedAt": datetime.now(UTC) if payload.is_published else None,
        },
    )
    return ok(item.model_dump(mode="json"))


@router.delete("/blog-posts/{post_id}")
async def admin_delete_blog_post(post_id: str) -> dict:
    await db.blogpost.update(where={"id": post_id}, data={"deletedAt": datetime.now(UTC)})
    return ok({"deleted": True, "post_id": post_id})


@router.get("/tutorials")
async def admin_list_tutorials(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    where = {"deletedAt": None}
    total = await db.tutorial.count(where=where)
    items = await db.tutorial.find_many(
        where=where, order={"createdAt": "desc"}, skip=(page - 1) * page_size, take=page_size
    )
    return ok(_paginate([item.model_dump(mode="json") for item in items], total, page, page_size))


@router.post("/tutorials")
async def admin_create_tutorial(payload: TutorialAdminIn) -> dict:
    item = await db.tutorial.create(
        data={
            "slug": payload.slug,
            "languageCode": payload.language_code,
            "title": payload.title,
            "summary": payload.summary,
            "content": _sanitize_markdown(payload.content),
            "isPublished": payload.is_published,
            "publishedAt": datetime.now(UTC) if payload.is_published else None,
        }
    )
    return ok(item.model_dump(mode="json"))


@router.patch("/tutorials/{tutorial_id}")
async def admin_update_tutorial(tutorial_id: str, payload: TutorialAdminIn) -> dict:
    item = await db.tutorial.update(
        where={"id": tutorial_id},
        data={
            "slug": payload.slug,
            "languageCode": payload.language_code,
            "title": payload.title,
            "summary": payload.summary,
            "content": _sanitize_markdown(payload.content),
            "isPublished": payload.is_published,
            "publishedAt": datetime.now(UTC) if payload.is_published else None,
        },
    )
    return ok(item.model_dump(mode="json"))


@router.delete("/tutorials/{tutorial_id}")
async def admin_delete_tutorial(tutorial_id: str) -> dict:
    await db.tutorial.update(where={"id": tutorial_id}, data={"deletedAt": datetime.now(UTC)})
    return ok({"deleted": True, "tutorial_id": tutorial_id})


@router.get("/subscription-plans")
async def admin_list_subscription_plans() -> dict:
    plans = await db.subscriptionplan.find_many(
        include={"entitlements": {"include": {"entitlement": True}}},
        order={"amountCents": "asc"},
    )
    items = []
    for plan in plans:
        payload = plan.model_dump(mode="json")
        payload["entitlement_codes"] = [
            row.entitlement.code for row in plan.entitlements if row.entitlement is not None
        ]
        items.append(payload)
    return ok(items)


@router.get("/companies/{company_id}/premium")
async def admin_get_company_premium(company_id: str) -> dict:
    company = await db.company.find_unique(where={"id": company_id})
    if company is None:
        return ok({"company_id": company_id, "subscriptions": [], "payment_customers": []})
    subscriptions = await db.subscription.find_many(
        where={"companyId": company_id},
        include={
            "plan": True,
            "entitlements": {"include": {"entitlement": True}},
        },
        order={"createdAt": "desc"},
    )
    payment_customers = await db.paymentcustomer.find_many(
        where={"companyId": company_id},
        order={"createdAt": "desc"},
    )
    subscription_items = []
    for subscription in subscriptions:
        item = subscription.model_dump(mode="json")
        item["plan_code"] = subscription.plan.code if subscription.plan else None
        item["entitlement_codes"] = [
            row.entitlement.code for row in subscription.entitlements if row.entitlement is not None
        ]
        subscription_items.append(item)
    return ok(
        {
            "company_id": company_id,
            "subscriptions": subscription_items,
            "payment_customers": [customer.model_dump(mode="json") for customer in payment_customers],
        }
    )


@router.post("/companies/{company_id}/premium/grant")
async def admin_grant_company_premium(company_id: str, payload: PremiumGrantIn) -> dict:
    plan = await db.subscriptionplan.find_unique(where={"code": payload.plan_code})
    if plan is None:
        return ok({"granted": False, "reason": "plan_not_found", "plan_code": payload.plan_code})
    now = datetime.now(UTC)
    ends_at = now.replace() + timedelta(days=max(payload.duration_days, 1))
    subscription = await db.subscription.create(
        data={
            "company": {"connect": {"id": company_id}},
            "plan": {"connect": {"id": plan.id}},
            "status": payload.status,
            "startsAt": now,
            "endsAt": ends_at,
            "externalRef": payload.external_ref or f"admin:{payload.plan_code}:{int(now.timestamp())}",
        }
    )
    plan_entitlements = await db.planentitlement.find_many(
        where={"subscriptionPlanId": plan.id},
        include={"entitlement": True},
    )
    for row in plan_entitlements:
        await db.subscriptionentitlement.upsert(
            where={
                "subscriptionId_entitlementId": {
                    "subscriptionId": subscription.id,
                    "entitlementId": row.entitlementId,
                }
            },
            data={
                "create": {
                    "subscription": {"connect": {"id": subscription.id}},
                    "entitlement": {"connect": {"id": row.entitlementId}},
                    "expiresAt": ends_at,
                },
                "update": {"expiresAt": ends_at},
            },
        )
    customer = await db.paymentcustomer.find_first(
        where={"companyId": company_id, "provider": payload.provider}
    )
    if customer is None:
        await db.paymentcustomer.create(
            data={
                "company": {"connect": {"id": company_id}},
                "provider": payload.provider,
                "providerCustomerId": f"{payload.provider}:{company_id}",
                "metadata": Json({"created_by": "admin", "placeholder": True}),
            }
        )
    return ok(
        {
            "granted": True,
            "company_id": company_id,
            "subscription_id": subscription.id,
            "plan_code": plan.code,
            "ends_at": ends_at.isoformat(),
        }
    )


@router.post("/companies/{company_id}/premium/unlock")
async def admin_grant_company_unlock(company_id: str, payload: CompanyEntitlementGrantIn) -> dict:
    entitlement = await db.entitlement.find_unique(where={"code": payload.entitlement_code})
    if entitlement is None:
        return ok(
            {
                "granted": False,
                "reason": "entitlement_not_found",
                "entitlement_code": payload.entitlement_code,
            }
        )
    now = datetime.now(UTC)
    ends_at = now.replace() + timedelta(days=max(payload.duration_days, 1))
    active_subscription = await db.subscription.find_first(
        where={"companyId": company_id, "status": "ACTIVE"},
        order={"createdAt": "desc"},
    )
    subscription = active_subscription
    if subscription is None:
        plan = await db.subscriptionplan.find_first(order={"amountCents": "asc"})
        if plan is None:
            return ok({"granted": False, "reason": "no_subscription_plan"})
        subscription = await db.subscription.create(
            data={
                "company": {"connect": {"id": company_id}},
                "plan": {"connect": {"id": plan.id}},
                "status": "ACTIVE",
                "startsAt": now,
                "endsAt": ends_at,
                "externalRef": f"admin_unlock:{company_id}:{int(now.timestamp())}",
            }
        )
    await db.subscriptionentitlement.upsert(
        where={
            "subscriptionId_entitlementId": {
                "subscriptionId": subscription.id,
                "entitlementId": entitlement.id,
            }
        },
        data={
            "create": {
                "subscription": {"connect": {"id": subscription.id}},
                "entitlement": {"connect": {"id": entitlement.id}},
                "expiresAt": ends_at,
            },
            "update": {"expiresAt": ends_at},
        },
    )
    return ok(
        {
            "granted": True,
            "company_id": company_id,
            "subscription_id": subscription.id,
            "entitlement_code": entitlement.code,
            "expires_at": ends_at.isoformat(),
        }
    )
