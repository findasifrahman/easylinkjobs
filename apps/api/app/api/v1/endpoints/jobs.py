import re
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from prisma import Json

from app.core.authz import get_current_user, require_permission
from app.core.db import db
from app.core.responses import ok

router = APIRouter()
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
)

EDUCATION_LEVEL_MAP = {
    "HIGH_SCHOOL": "HIGH_SCHOOL",
    "DIPLOMA": "DIPLOMA",
    "ASSOCIATE": "DIPLOMA",
    "BACHELOR": "BACHELORS",
    "BACHELORS": "BACHELORS",
    "MASTER": "MASTERS",
    "MASTERS": "MASTERS",
    "DOCTORATE": "PHD",
    "PHD": "PHD",
    "OTHER": "OTHER",
}


class JobIn(BaseModel):
    company_id: str
    category_id: str | None = None
    title: str
    description: str
    language_code: str = "EN"
    city: str
    province: str | None = None
    country: str
    currency: str = "CNY"
    salary_min: int | None = None
    salary_max: int | None = None
    visa_sponsorship: bool = False
    foreigner_eligible: bool = True
    chinese_required_level: str = "NONE"
    remote_policy: str = "ONSITE"
    job_type: str = "FULL_TIME"
    contact_visibility_policy: str = "APPLICANTS_ONLY"
    source: str = "DIRECT"
    source_url: str | None = None
    work_permit_support: bool = False
    english_required: bool = True
    relocation_support: bool = False
    housing_provided: bool = False
    experience_years: int | None = None
    education_level: str | None = None
    headcount: int | None = None
    application_deadline: datetime
    special_instructions: str | None = None
    benefits: dict | None = None
    screening_questions: dict | None = None
    is_published: bool = False


def _normalize_education_level(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper()
    if not normalized:
        return None
    return EDUCATION_LEVEL_MAP.get(normalized, normalized)


@router.get("/public")
async def public_list_jobs(
    city: str | None = Query(default=None),
    category: str | None = Query(default=None),
    visa_type: str | None = Query(default=None),
    visa_sponsorship: bool | None = Query(default=None),
    nationality: str | None = Query(default=None),
    q: str | None = Query(default=None),
    source: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    resolved_visa_sponsorship = visa_sponsorship
    if resolved_visa_sponsorship is None and visa_type:
        normalized = visa_type.lower()
        resolved_visa_sponsorship = normalized not in {"none", "no", "not-sponsored"}

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
          AND ($1::text IS NULL OR lower(j.city) = lower($1::text))
          AND ($2::text IS NULL OR lower(jc.slug) = lower($2::text))
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
        city,
        category,
        resolved_visa_sponsorship,
        source,
        q,
        nationality,
        page_size,
        (page - 1) * page_size,
    )
    return ok(rows)


@router.get("/public/{job_id}")
async def public_job_detail(job_id: str) -> dict:
    job = None
    if UUID_RE.fullmatch(job_id):
        job = await db.job.find_unique(where={"id": job_id}, include={"company": True, "locations": True})
    else:
        rows = await db.query_raw(
            """
            SELECT id
            FROM jobs
            WHERE is_published = true
              AND deleted_at IS NULL
              AND (
                lower(trim(both '-' from regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))) = $1::text
                OR lower(trim(both '-' from regexp_replace(regexp_replace(city || '-' || title, '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'))) = $1::text
              )
            ORDER BY created_at DESC
            LIMIT 1
            """,
            job_id.lower(),
        )
        if rows:
            job = await db.job.find_unique(
                where={"id": rows[0]["id"]},
                include={"company": True, "locations": True},
            )
    if job is None or not job.isPublished:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.applicationDeadline is not None and job.applicationDeadline < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return ok(job.model_dump(mode="json"))


@router.get("/mine")
async def list_my_company_jobs(
    company_id: str = Query(...),
    _: None = Depends(require_permission("jobs:update")),
) -> dict:
    jobs = await db.job.find_many(where={"companyId": company_id, "deletedAt": None}, order={"createdAt": "desc"})
    return ok([job.model_dump(mode="json") for job in jobs])


@router.get("/company/{company_id}/table")
async def list_company_jobs_table(
    company_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    _: None = Depends(require_permission("jobs:update")),
) -> dict:
    where = {"companyId": company_id, "deletedAt": None}
    total = await db.job.count(where=where)
    jobs = await db.job.find_many(
        where=where,
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )
    return ok(
        {
            "items": [job.model_dump(mode="json") for job in jobs],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.post("/", dependencies=[Depends(require_permission("jobs:create"))])
async def create_job(
    payload: JobIn,
    _: dict[str, str] = Depends(get_current_user),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> dict:
    if x_company_id and x_company_id != payload.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company scope mismatch")
    if not payload.category_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job category is required")
    education_level = _normalize_education_level(payload.education_level)
    data: dict[str, object] = {
        "company": {"connect": {"id": payload.company_id}},
        "title": payload.title,
        "description": payload.description,
        "languageCode": payload.language_code,
        "city": payload.city,
        "province": payload.province,
        "country": payload.country,
        "currency": payload.currency,
        "salaryMin": payload.salary_min,
        "salaryMax": payload.salary_max,
        "visaSponsorship": payload.visa_sponsorship,
        "foreignerEligible": payload.foreigner_eligible,
        "chineseRequiredLevel": payload.chinese_required_level,
        "remotePolicy": payload.remote_policy,
        "jobType": payload.job_type,
        "contactVisibilityPolicy": payload.contact_visibility_policy,
        "source": payload.source,
        "sourceUrl": payload.source_url,
        "workPermitSupport": payload.work_permit_support,
        "englishRequired": payload.english_required,
        "relocationSupport": payload.relocation_support,
        "housingProvided": payload.housing_provided,
        "experienceYears": payload.experience_years,
        "educationLevel": education_level,
        "headcount": payload.headcount,
        "applicationDeadline": payload.application_deadline,
        "benefits": Json(payload.benefits) if payload.benefits is not None else None,
        "screeningQuestions": Json(payload.screening_questions) if payload.screening_questions is not None else None,
        "metadata": Json({"special_instructions": payload.special_instructions}) if payload.special_instructions else None,
        "isPublished": False,
    }
    if payload.category_id:
        data["category"] = {"connect": {"id": payload.category_id}}
    job = await db.job.create(data=data)
    return ok(job.model_dump(mode="json"))


@router.patch("/{job_id}", dependencies=[Depends(require_permission("jobs:update"))])
async def update_job(
    job_id: str,
    payload: JobIn,
    _: dict[str, str] = Depends(get_current_user),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> dict:
    if x_company_id and x_company_id != payload.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company scope mismatch")
    if not payload.category_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job category is required")
    education_level = _normalize_education_level(payload.education_level)
    data: dict[str, object] = {
        "companyId": payload.company_id,
        "title": payload.title,
        "description": payload.description,
        "languageCode": payload.language_code,
        "city": payload.city,
        "province": payload.province,
        "country": payload.country,
        "currency": payload.currency,
        "salaryMin": payload.salary_min,
        "salaryMax": payload.salary_max,
        "visaSponsorship": payload.visa_sponsorship,
        "foreignerEligible": payload.foreigner_eligible,
        "chineseRequiredLevel": payload.chinese_required_level,
        "remotePolicy": payload.remote_policy,
        "jobType": payload.job_type,
        "contactVisibilityPolicy": payload.contact_visibility_policy,
        "source": payload.source,
        "sourceUrl": payload.source_url,
        "workPermitSupport": payload.work_permit_support,
        "englishRequired": payload.english_required,
        "relocationSupport": payload.relocation_support,
        "housingProvided": payload.housing_provided,
        "experienceYears": payload.experience_years,
        "educationLevel": education_level,
        "headcount": payload.headcount,
        "applicationDeadline": payload.application_deadline,
        "benefits": Json(payload.benefits) if payload.benefits is not None else None,
        "screeningQuestions": Json(payload.screening_questions) if payload.screening_questions is not None else None,
        "metadata": Json({"special_instructions": payload.special_instructions}) if payload.special_instructions else None,
        "isPublished": False,
        "categoryId": payload.category_id,
    }
    job = await db.job.update(
        where={"id": job_id},
        data=data,
    )
    return ok(job.model_dump(mode="json"))


@router.delete("/{job_id}", dependencies=[Depends(require_permission("jobs:delete"))])
async def delete_job(job_id: str, _: dict[str, str] = Depends(get_current_user)) -> dict:
    await db.job.delete(where={"id": job_id})
    return ok({"deleted": True})
