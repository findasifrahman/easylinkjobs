from fastapi import APIRouter, Depends

from app.core.authz import get_current_user, get_effective_permissions
from app.core.db import db
from app.core.responses import ok

router = APIRouter()


@router.get("/me")
async def me(user: dict[str, str] = Depends(get_current_user)) -> dict:
    db_user = await db.user.find_unique(
        where={"id": user["id"]},
        include={"candidate": True, "companyMembers": True},
    )
    company_memberships = []
    primary_company = None
    company_permissions: dict[str, list[str]] = {}
    for member in db_user.companyMembers:
        if not getattr(member, "companyId", None):
            continue
        rows = await db.query_raw(
            """
            SELECT id, name, slug
            FROM companies
            WHERE id = $1::uuid
            LIMIT 1
            """,
            member.companyId,
        )
        if not rows:
            continue
        company_row = rows[0]
        item = {
            "id": str(company_row["id"]),
            "name": str(company_row["name"]),
            "slug": str(company_row["slug"]),
            "status": member.status,
            "title": member.title,
        }
        company_memberships.append(item)
        if primary_company is None and member.status == "ACTIVE":
            primary_company = item
        company_permissions[member.companyId] = sorted(
            await get_effective_permissions(db_user.id, member.companyId)
        )
    global_permissions = sorted(await get_effective_permissions(db_user.id, None))
    role_hint = "guest"
    if "admin:access" in global_permissions:
        role_hint = "admin"
    elif primary_company is not None and (
        "jobs:create" in company_permissions.get(primary_company["id"], [])
        or "applications:read" in company_permissions.get(primary_company["id"], [])
    ):
        role_hint = "company"
    elif db_user.candidate is not None:
        role_hint = "candidate"
    return ok(
        {
            "id": db_user.id,
            "email": db_user.email,
            "status": db_user.status,
            "last_login_at": db_user.lastLoginAt.isoformat() if db_user.lastLoginAt else None,
            "display_name": (db_user.email.split("@", 1)[0]).replace(".", " ").title(),
            "role_hint": role_hint,
            "candidate_id": db_user.candidate.id if db_user.candidate is not None else None,
            "primary_company": primary_company,
            "company_memberships": company_memberships,
            "permission_summary": {
                "global": global_permissions,
                "by_company": company_permissions,
            },
        }
    )
