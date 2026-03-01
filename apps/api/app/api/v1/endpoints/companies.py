from typing import Literal

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from prisma.errors import DataError

from app.core.authz import get_current_user, require_permission
from app.core.db import db
from app.core.responses import ok

router = APIRouter()


class CompanyIn(BaseModel):
    name: str
    slug: str
    contact_name: str | None = None
    contact_designation: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    address_line_1: str | None = None
    business_license_no: str | None = None
    company_type: Literal["CHINESE", "WFOE", "RO", "FOREIGN_STARTUP", "AGENCY", "OTHER"] = "OTHER"
    org_size: Literal["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"] = "SMALL"
    city: str | None = None
    province: str | None = None
    country: str | None = None
    website: str | None = None
    description: str | None = None


async def _has_company_signup_columns() -> bool:
    rows = await db.query_raw(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'companies'
          AND column_name = 'contact_name'
        LIMIT 1
        """
    )
    return bool(rows)


def _base_company_select(include_signup_fields: bool) -> str:
    extra = """
      , contact_name
      , contact_designation
      , contact_email
      , contact_phone
      , address_line_1
      , business_license_no
    """ if include_signup_fields else ""
    return f"""
      SELECT
        id,
        name,
        slug,
        company_type::text AS company_type,
        org_size::text AS org_size,
        website,
        description,
        city,
        province,
        country,
        verification_status::text AS verification_status,
        verified_at,
        created_at,
        deleted_at
        {extra}
      FROM companies
    """


@router.post("/", dependencies=[Depends(require_permission("companies:create"))])
async def create_company(payload: CompanyIn, _: dict[str, str] = Depends(get_current_user)) -> dict:
    try:
        company = await db.company.create(
            data={
                "name": payload.name,
                "slug": payload.slug,
                "contactName": payload.contact_name,
                "contactDesignation": payload.contact_designation,
                "contactEmail": payload.contact_email,
                "contactPhone": payload.contact_phone,
                "addressLine1": payload.address_line_1,
                "businessLicenseNo": payload.business_license_no,
                "companyType": payload.company_type,
                "orgSize": payload.org_size,
                "city": payload.city,
                "province": payload.province,
                "country": payload.country,
                "website": payload.website,
                "description": payload.description,
            }
        )
        return ok(company.model_dump(mode="json"))
    except DataError as exc:
        if "contact_name" not in str(exc):
            raise
        rows = await db.query_raw(
            """
            INSERT INTO companies (
              id,
              name,
              slug,
              company_type,
              org_size,
              city,
              province,
              country,
              website,
              description,
              verification_status,
              created_at
            )
            VALUES (
              gen_random_uuid(),
              $1::text,
              $2::text,
              $3::"CompanyType",
              $4::"OrgSize",
              $5::text,
              $6::text,
              $7::text,
              $8::text,
              $9::text,
              'UNVERIFIED'::"VerificationStatus",
              now()
            )
            RETURNING
              id,
              name,
              slug,
              company_type::text AS company_type,
              org_size::text AS org_size,
              website,
              description,
              city,
              province,
              country,
              verification_status::text AS verification_status,
              verified_at,
              created_at,
              deleted_at
            """,
            payload.name,
            payload.slug,
            payload.company_type,
            payload.org_size,
            payload.city,
            payload.province,
            payload.country,
            payload.website,
            payload.description,
        )
        return ok(rows[0])


@router.get("/")
async def list_companies() -> dict:
    include_signup_fields = await _has_company_signup_columns()
    rows = await db.query_raw(
        _base_company_select(include_signup_fields)
        + """
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 100
        """
    )
    return ok(rows)


@router.get("/{company_id}")
async def get_company(company_id: str) -> dict:
    include_signup_fields = await _has_company_signup_columns()
    rows = await db.query_raw(
        _base_company_select(include_signup_fields)
        + """
        WHERE id = $1::uuid
        LIMIT 1
        """,
        company_id,
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return ok(rows[0])


@router.patch("/{company_id}", dependencies=[Depends(require_permission("companies:update"))])
async def update_company(company_id: str, payload: CompanyIn, _: dict[str, str] = Depends(get_current_user)) -> dict:
    try:
        company = await db.company.update(
            where={"id": company_id},
            data={
                "name": payload.name,
                "slug": payload.slug,
                "contactName": payload.contact_name,
                "contactDesignation": payload.contact_designation,
                "contactEmail": payload.contact_email,
                "contactPhone": payload.contact_phone,
                "addressLine1": payload.address_line_1,
                "businessLicenseNo": payload.business_license_no,
                "companyType": payload.company_type,
                "orgSize": payload.org_size,
                "city": payload.city,
                "province": payload.province,
                "country": payload.country,
                "website": payload.website,
                "description": payload.description,
            },
        )
        return ok(company.model_dump(mode="json"))
    except DataError as exc:
        if "contact_name" not in str(exc):
            raise
        rows = await db.query_raw(
            """
            UPDATE companies
            SET
              name = $2::text,
              slug = $3::text,
              company_type = $4::"CompanyType",
              org_size = $5::"OrgSize",
              city = $6::text,
              province = $7::text,
              country = $8::text,
              website = $9::text,
              description = $10::text
            WHERE id = $1::uuid
            RETURNING
              id,
              name,
              slug,
              company_type::text AS company_type,
              org_size::text AS org_size,
              website,
              description,
              city,
              province,
              country,
              verification_status::text AS verification_status,
              verified_at,
              created_at,
              deleted_at
            """,
            company_id,
            payload.name,
            payload.slug,
            payload.company_type,
            payload.org_size,
            payload.city,
            payload.province,
            payload.country,
            payload.website,
            payload.description,
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        return ok(rows[0])


@router.get("/{company_id}/members", dependencies=[Depends(require_permission("companies:update"))])
async def list_company_members(
    company_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    total = await db.companymember.count(where={"companyId": company_id})
    members = await db.companymember.find_many(
        where={"companyId": company_id},
        include={"user": True, "role": True},
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )
    active_subscription = await db.subscription.find_first(
        where={"companyId": company_id, "status": "ACTIVE", "endsAt": {"gte": datetime.now(UTC)}},
        order={"createdAt": "desc"},
    )
    included_seats = 10 if active_subscription is not None else 3
    items = []
    for member in members:
        items.append(
            {
                "id": member.id,
                "title": member.title,
                "status": member.status,
                "created_at": member.createdAt.isoformat(),
                "user": member.user.model_dump(mode="json") if member.user else None,
                "role": member.role.model_dump(mode="json") if member.role else None,
            }
        )
    return ok(
        {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "seat_summary": {
                "included_seats": included_seats,
                "used_seats": total,
                "available_seats": max(included_seats - total, 0),
                "requires_upgrade": total >= included_seats,
            },
        }
    )
