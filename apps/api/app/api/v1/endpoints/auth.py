import secrets
import re
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from prisma.errors import DataError

from app.core.authz import get_current_user
from app.core.config import get_settings
from app.core.db import db
from app.core.rate_limit import rate_limit
from app.core.redis_client import get_redis
from app.core.responses import ok
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    parse_duration,
    token_hash,
    validate_password_strength,
    verify_password,
)
from app.schemas.auth import CandidateSignupIn, CompanySignupIn, ForgotPasswordIn, LoginIn, LogoutIn, RefreshIn, ResetPasswordIn, SignupIn
from app.services.candidate_profile import refresh_profile_completion

router = APIRouter()


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


def _build_password_reset_url(raw_token: str) -> str:
    settings = get_settings()
    origins = settings.cors_origin_list
    app_url = origins[0] if origins else "http://localhost:3000"
    base = app_url.rstrip("/")
    return f"{base}/en/reset-password?token={raw_token}"


async def _issue_auth_tokens(user_id: str, email: str, request: Request) -> dict[str, str]:
    session_id = str(uuid4())
    refresh_ttl = parse_duration(get_settings().jwt_refresh_expires)
    session = await db.authsession.create(
        data={
            "id": session_id,
            "user": {"connect": {"id": user_id}},
            "refreshTokenHash": "pending",
            "status": "ACTIVE",
            "userAgent": request.headers.get("user-agent"),
            "ipAddress": request.client.host if request.client else None,
            "expiresAt": datetime.now(UTC) + refresh_ttl,
        }
    )
    refresh_token, _ = create_refresh_token(user_id, session.id)
    access_token = create_access_token(user_id, email)
    await db.authsession.update(where={"id": session.id}, data={"refreshTokenHash": token_hash(refresh_token)})
    redis = get_redis()
    if redis is not None:
        await redis.setex(f"session:{session.id}", int(refresh_ttl.total_seconds()), "active")
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


async def _create_candidate_account(payload: CandidateSignupIn, request: Request) -> dict:
    validate_password_strength(payload.password)
    existing = await db.user.find_unique(where={"email": payload.email})
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    user = await db.user.create(
        data={"email": payload.email, "passwordHash": hash_password(payload.password), "status": "ACTIVE"}
    )
    candidate = await db.candidate.create(data={"user": {"connect": {"id": user.id}}, "status": "CLAIMED", "source": "signup"})
    await db.candidateprofile.create(
        data={
            "candidate": {"connect": {"id": candidate.id}},
            "fullName": payload.full_name,
            "phone": payload.phone,
            "email": payload.email,
        }
    )
    score = await refresh_profile_completion(candidate.id)
    tokens = await _issue_auth_tokens(user.id, user.email, request)
    return ok(
        {
            "user_id": user.id,
            "email": user.email,
            "candidate_id": candidate.id,
            "profile_completion_score": score,
            **tokens,
            "email_verification": "placeholder",
        }
    )


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "company"


async def _make_unique_company_slug(company_name: str) -> str:
    base_slug = _slugify(company_name)
    slug = base_slug
    counter = 2
    while await db.company.find_unique(where={"slug": slug}) is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


@router.post("/signup", dependencies=[Depends(rate_limit(20, 60))])
async def signup(payload: SignupIn, request: Request) -> dict:
    candidate_payload = CandidateSignupIn(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        phone=payload.phone or "000000",
    )
    return await _create_candidate_account(candidate_payload, request)


@router.post("/signup/candidate", dependencies=[Depends(rate_limit(20, 60))])
async def signup_candidate(payload: CandidateSignupIn, request: Request) -> dict:
    return await _create_candidate_account(payload, request)


@router.post("/signup/company", dependencies=[Depends(rate_limit(20, 60))])
async def signup_company(payload: CompanySignupIn, request: Request) -> dict:
    validate_password_strength(payload.password)
    existing = await db.user.find_unique(where={"email": payload.email})
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    role = await db.role.find_unique(where={"key": "job_admin"})
    if role is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="job_admin role is not seeded")
    user = await db.user.create(
        data={"email": payload.email, "passwordHash": hash_password(payload.password), "status": "ACTIVE"}
    )
    company_slug = await _make_unique_company_slug(payload.company_name)
    try:
        company = await db.company.create(
            data={
                "name": payload.company_name,
                "slug": company_slug,
                "contactName": payload.contact_name,
                "contactDesignation": payload.contact_designation,
                "contactEmail": payload.email,
                "contactPhone": payload.phone,
                "addressLine1": payload.address_line_1,
                "businessLicenseNo": payload.business_license_no,
                "companyType": payload.company_type,
                "orgSize": payload.org_size,
                "website": payload.website,
                "description": payload.description,
                "city": payload.city,
                "province": payload.province,
                "country": payload.country,
                "verificationStatus": "PENDING",
            }
        )
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
              website,
              description,
              city,
              province,
              country,
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
              'PENDING'::"VerificationStatus",
              now()
            )
            RETURNING id, slug, verification_status::text AS verification_status
            """,
            payload.company_name,
            company_slug,
            payload.company_type,
            payload.org_size,
            payload.website,
            payload.description,
            payload.city,
            payload.province,
            payload.country,
        )
        company = type(
            "LegacyCompanyRow",
            (),
            {
                "id": rows[0]["id"],
                "slug": rows[0]["slug"],
                "verificationStatus": rows[0]["verification_status"],
            },
        )()
    await db.companymember.create(
        data={
            "company": {"connect": {"id": company.id}},
            "user": {"connect": {"id": user.id}},
            "role": {"connect": {"id": role.id}},
            "title": payload.contact_designation,
            "status": "ACTIVE",
        }
    )
    await db.userrole.create(
        data={
            "user": {"connect": {"id": user.id}},
            "role": {"connect": {"id": role.id}},
            "company": {"connect": {"id": company.id}},
        }
    )
    tokens = await _issue_auth_tokens(user.id, user.email, request)
    return ok(
        {
            "user_id": user.id,
            "email": user.email,
            "company_id": company.id,
            "company_slug": company.slug,
            "verification_status": company.verificationStatus,
            **tokens,
            "email_verification": "placeholder",
        }
    )


@router.post("/login", dependencies=[Depends(rate_limit(30, 60))])
async def login(payload: LoginIn, request: Request) -> dict:
    user = await db.user.find_unique(where={"email": payload.email})
    if user is None or not verify_password(payload.password, user.passwordHash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if hasattr(db.user, "update"):
        await db.user.update(where={"id": user.id}, data={"lastLoginAt": datetime.now(UTC)})
    return ok(await _issue_auth_tokens(user.id, user.email, request))


@router.post("/refresh", dependencies=[Depends(rate_limit(60, 60))])
async def refresh(payload: RefreshIn) -> dict:
    claims = decode_refresh_token(payload.refresh_token)
    session = await db.authsession.find_unique(where={"id": claims["sid"]})
    if session is None or session.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session inactive")
    if session.refreshTokenHash != token_hash(payload.refresh_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token mismatch")
    if session.expiresAt < datetime.now(UTC):
        await db.authsession.update(where={"id": session.id}, data={"status": "EXPIRED"})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    user = await db.user.find_unique(where={"id": claims["sub"]})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return ok({"access_token": create_access_token(user.id, user.email), "token_type": "bearer"})


@router.post("/logout")
async def logout(payload: LogoutIn) -> dict:
    claims = decode_refresh_token(payload.refresh_token)
    session = await db.authsession.find_unique(where={"id": claims["sid"]})
    if session is not None:
        await db.authsession.update(
            where={"id": session.id}, data={"status": "REVOKED", "revokedAt": datetime.now(UTC)}
        )
        redis = get_redis()
        if redis is not None:
            await redis.delete(f"session:{session.id}")
    return ok({"logged_out": True})


@router.post("/change-password")
async def change_password(payload: ChangePasswordIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    db_user = await db.user.find_unique(where={"id": user["id"]})
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not verify_password(payload.current_password, db_user.passwordHash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    validate_password_strength(payload.new_password)
    await db.user.update(where={"id": db_user.id}, data={"passwordHash": hash_password(payload.new_password)})
    return ok({"changed": True})


@router.post("/forgot-password", dependencies=[Depends(rate_limit(10, 300))])
async def forgot_password(payload: ForgotPasswordIn) -> dict:
    user = await db.user.find_unique(where={"email": payload.email})
    if user is not None:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + parse_duration("2h")
        await db.passwordresettoken.create(
            data={
                "user": {"connect": {"id": user.id}},
                "tokenHash": token_hash(raw_token),
                "expiresAt": expires_at,
            }
        )
        reset_url = _build_password_reset_url(raw_token)
        print(f"[auth] password reset placeholder for {user.email}: {reset_url}")
    return ok(
        {
            "submitted": True,
            "message": "If the email exists, a reset link has been generated and logged server-side.",
        }
    )


@router.post("/reset-password", dependencies=[Depends(rate_limit(10, 300))])
async def reset_password(payload: ResetPasswordIn) -> dict:
    validate_password_strength(payload.new_password)
    reset_token = await db.passwordresettoken.find_unique(where={"tokenHash": token_hash(payload.token)})
    if reset_token is None or reset_token.usedAt is not None or reset_token.expiresAt < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    user = await db.user.find_unique(where={"id": reset_token.userId})
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await db.user.update(where={"id": user.id}, data={"passwordHash": hash_password(payload.new_password)})
    await db.passwordresettoken.update(where={"id": reset_token.id}, data={"usedAt": datetime.now(UTC)})
    await db.authsession.update_many(where={"userId": user.id, "status": "ACTIVE"}, data={"status": "REVOKED"})
    return ok({"reset": True})
