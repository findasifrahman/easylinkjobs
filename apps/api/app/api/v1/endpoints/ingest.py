import hashlib
import re
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, HttpUrl
from prisma import Json

from app.core.config import get_settings
from app.core.db import db
from app.core.redis_client import get_redis
from app.core.responses import ok

router = APIRouter()


class IngestJobIn(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    company_name: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=20)
    city: str = Field(min_length=2, max_length=120)
    country: str = Field(min_length=2, max_length=120)
    province: str | None = Field(default=None, max_length=120)
    source_url: HttpUrl
    visa_sponsorship: bool = False
    foreigner_eligible: bool = True
    work_permit_support: bool = False
    english_required: bool = True
    relocation_support: bool = False
    housing_provided: bool = False
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str = "CNY"
    raw_source_snapshot: dict[str, Any]
    published: bool = True


class IngestBatchIn(BaseModel):
    jobs: list[IngestJobIn] = Field(min_length=1, max_length=100)


def _slugify(value: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", value.lower().strip()))


async def _validate_ingestion_key(key: str | None) -> None:
    expected = get_settings().ingestion_api_key
    if not expected or key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingestion key")


async def _rate_limit_ingest(request: Request) -> None:
    redis = get_redis()
    if redis is None:
        return
    limit = get_settings().ingestion_rate_limit_per_minute
    client_host = request.client.host if request.client else "unknown"
    key = f"rl:ingest:{client_host}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Ingestion rate limit exceeded")


async def _is_duplicate(source_hash: str, payload: IngestJobIn) -> bool:
    rows = await db.query_raw(
        """
        SELECT j.id
        FROM jobs j
        LEFT JOIN companies c ON c.id = j.company_id
        WHERE (
          j.metadata ->> 'source_url_hash' = $1::text
          OR (
            lower(j.title) = lower($2::text)
            AND lower(coalesce(c.name, '')) = lower($3::text)
            AND lower(j.city) = lower($4::text)
          )
        )
        LIMIT 1
        """,
        source_hash,
        payload.title,
        payload.company_name,
        payload.city,
    )
    return bool(rows)


@router.post("/jobs")
async def ingest_jobs(
    payload: IngestBatchIn,
    request: Request,
    x_ingestion_key: str | None = Header(default=None, alias="X-Ingestion-Key"),
) -> dict:
    await _validate_ingestion_key(x_ingestion_key)
    await _rate_limit_ingest(request)

    inserted = 0
    skipped = 0
    for item in payload.jobs:
        source_url = str(item.source_url)
        source_hash = hashlib.sha256(source_url.encode()).hexdigest()
        if await _is_duplicate(source_hash, item):
            skipped += 1
            continue

        company_slug = _slugify(item.company_name) or f"company-{source_hash[:8]}"
        company = await db.company.find_first(where={"slug": company_slug})
        if company is None:
            company = await db.company.create(
                data={
                    "name": item.company_name,
                    "slug": company_slug,
                    "companyType": "OTHER",
                    "orgSize": "SMALL",
                    "city": item.city,
                    "province": item.province,
                    "country": item.country,
                    "verificationStatus": "UNVERIFIED",
                }
            )

        await db.job.create(
            data={
                "company": {"connect": {"id": company.id}},
                "title": item.title,
                "description": item.description,
                "city": item.city,
                "province": item.province,
                "country": item.country,
                "salaryMin": item.salary_min,
                "salaryMax": item.salary_max,
                "currency": item.currency,
                "visaSponsorship": item.visa_sponsorship,
                "foreignerEligible": item.foreigner_eligible,
                "workPermitSupport": item.work_permit_support,
                "englishRequired": item.english_required,
                "relocationSupport": item.relocation_support,
                "housingProvided": item.housing_provided,
                "source": "SCRAPED",
                "sourceUrl": source_url,
                "isPublished": item.published,
                "metadata": Json(
                    {
                        "source_url_hash": source_hash,
                        "raw_source_snapshot": item.raw_source_snapshot,
                        "ingested_by": "clawbot",
                    }
                ),
            }
        )
        inserted += 1

    return ok({"inserted": inserted, "skipped": skipped})
