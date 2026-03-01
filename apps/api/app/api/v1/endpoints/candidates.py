from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from prisma import Json

from app.core.config import get_settings
from app.core.authz import get_current_user
from app.core.db import db
from app.core.responses import ok
from app.services.candidate_profile import refresh_profile_completion
from app.services.entitlements import company_has_candidate_search_access

router = APIRouter()


def _normalize_datetime_input(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if "T" in normalized:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed.isoformat()
    parsed_date = datetime.strptime(normalized, "%Y-%m-%d").replace(tzinfo=UTC)
    return parsed_date.isoformat()


def _normalize_english_proficiency_type(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized or normalized.lower() in {"none", "no test", "no english test"}:
        return None
    mapping = {
        "ielts": "IELTS",
        "toefl": "TOEFL",
        "duolingo": "DUOLINGO",
        "sat": "SAT",
        "ged": "GED",
        "other": "OTHER",
    }
    return mapping.get(normalized.lower(), normalized)


def _extract_profile_image_asset_id(extensible_data: Any) -> str | None:
    if isinstance(extensible_data, dict):
        value = extensible_data.get("profile_image_asset_id")
        if isinstance(value, str) and value:
            return value
    return None


class CandidateProfileUpdateIn(BaseModel):
    full_name: str | None = None
    dob: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    gender: Literal["Male", "Female", "Other"] | None = None
    phone: str | None = None
    address: str | None = None
    nationality: str | None = None
    current_country: str | None = None
    current_city: str | None = None
    ever_been_to_china: bool | None = None
    ever_rejected_china: bool | None = None
    china_education: bool | None = None
    visa_status: Literal["No visa", "Tourist visa", "Student visa", "Work visa", "Residence permit", "Other"] | None = None
    hsk_level: int | None = None
    english_proficiency_type: str | None = None
    english_score_overall: float | None = None
    english_score_reading: float | None = None
    english_score_writing: float | None = None
    english_score_speaking: float | None = None
    english_score_listening: float | None = None
    desired_job_titles: list[str] | None = None
    desired_cities: list[str] | None = None
    salary_expectation: int | None = None
    salary_currency: str | None = None
    work_permit_status: Literal["No permit", "Needs sponsorship", "Has active permit", "Eligible to apply", "Other"] | None = None
    summary: str | None = None
    profile_image_media_asset_id: str | None = None
    extensible_data: dict[str, Any] | None = None


class EducationIn(BaseModel):
    institution: str
    degree: str | None = None
    degree_type: str | None = None
    field_of_study: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_ongoing: bool = False
    passing_year: int | None = None
    cgpa: str | None = None
    country: str | None = None
    grade: str | None = None
    description: str | None = None


class ExperienceIn(BaseModel):
    company_name: str
    job_title: str
    employment_type: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    location_city: str | None = None
    location_country: str | None = None
    description: str | None = None


class SkillIn(BaseModel):
    name: str
    level: str | None = None
    years_of_experience: int | None = None


class CertificationIn(BaseModel):
    name: str
    issuing_org: str | None = None
    issued_at: str | None = None
    expires_at: str | None = None
    credential_id: str | None = None
    credential_url: str | None = None


class LanguageIn(BaseModel):
    language: str
    proficiency: str | None = None
    certification: str | None = None


class DocumentIn(BaseModel):
    media_asset_id: str | None = None
    document_type: str = Field(pattern="^(PASSPORT|CV|COVER_LETTER|CERTIFICATE|EDUCATION_DOC|OTHER)$")
    title: str | None = None
    language_code: str | None = None
    issued_at: str | None = None
    expires_at: str | None = None
    metadata: dict[str, Any] | None = None


async def _get_candidate_with_profile(user_id: str):
    candidate = await db.candidate.upsert(
        where={"userId": user_id},
        data={
            "create": {"user": {"connect": {"id": user_id}}, "status": "CLAIMED", "source": "profile_api"},
            "update": {"status": "CLAIMED"},
        },
        include={"profile": True},
    )
    if candidate.profile is None:
        await db.candidateprofile.create(
            data={
                "candidate": {"connect": {"id": candidate.id}},
                "fullName": "",
            }
        )
        candidate = await db.candidate.find_unique(where={"id": candidate.id}, include={"profile": True})
    return candidate


async def _get_profile(user_id: str):
    candidate = await _get_candidate_with_profile(user_id)
    if candidate.profile is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Candidate profile missing")
    return candidate, candidate.profile


async def _ensure_media_owner(user_id: str, media_asset_id: str | None) -> None:
    if media_asset_id is None:
        return
    asset = await db.mediaasset.find_unique(where={"id": media_asset_id})
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found")
    if asset.ownerUserId != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Media asset access denied")
    if asset.visibility != "PRIVATE":
        await db.mediaasset.update(where={"id": asset.id}, data={"visibility": "PRIVATE"})


@router.get("/profile")
async def get_profile(user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    score = await refresh_profile_completion(candidate.id)
    education = await db.candidateeducation.find_many(where={"candidateProfileId": profile.id})
    experience = await db.candidateexperience.find_many(where={"candidateProfileId": profile.id})
    skills = await db.candidateskill.find_many(where={"candidateProfileId": profile.id})
    languages = await db.candidatelanguage.find_many(where={"candidateProfileId": profile.id})
    certifications = await db.candidatecertification.find_many(where={"candidateProfileId": profile.id})
    documents = await db.candidatedocument.find_many(where={"candidateProfileId": profile.id})
    return ok(
        {
            "candidate": candidate.model_dump(mode="json"),
            "profile": profile.model_dump(mode="json"),
            "completion_score": score,
            "education": [x.model_dump(mode="json") for x in education],
            "experience": [x.model_dump(mode="json") for x in experience],
            "skills": [x.model_dump(mode="json") for x in skills],
            "languages": [x.model_dump(mode="json") for x in languages],
            "certifications": [x.model_dump(mode="json") for x in certifications],
            "documents": [x.model_dump(mode="json") for x in documents],
        }
    )


@router.put("/profile")
async def put_profile(payload: CandidateProfileUpdateIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    update_data = payload.model_dump(exclude_none=True)
    profile_image_media_asset_id = update_data.get("profile_image_media_asset_id")
    if profile_image_media_asset_id:
        await _ensure_media_owner(user["id"], profile_image_media_asset_id)
        asset = await db.mediaasset.find_unique(where={"id": profile_image_media_asset_id})
        if asset is None or not asset.mimeType.lower().startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile photo must be an image.")
    mapped: dict[str, Any] = {
        "fullName": update_data.get("full_name"),
        "dob": _normalize_datetime_input(update_data.get("dob")),
        "fatherName": update_data.get("father_name"),
        "motherName": update_data.get("mother_name"),
        "gender": update_data.get("gender"),
        "phone": update_data.get("phone"),
        "nationality": update_data.get("nationality"),
        "currentCountry": update_data.get("current_country"),
        "currentCity": update_data.get("current_city"),
        "everBeenToChina": update_data.get("ever_been_to_china"),
        "everRejectedChina": update_data.get("ever_rejected_china"),
        "chinaEducation": update_data.get("china_education"),
        "visaStatus": update_data.get("visa_status"),
        "hskLevel": update_data.get("hsk_level"),
        "englishProficiencyType": _normalize_english_proficiency_type(update_data.get("english_proficiency_type")),
        "englishScoreOverall": update_data.get("english_score_overall"),
        "englishScoreReading": update_data.get("english_score_reading"),
        "englishScoreWriting": update_data.get("english_score_writing"),
        "englishScoreSpeaking": update_data.get("english_score_speaking"),
        "englishScoreListening": update_data.get("english_score_listening"),
        "desiredJobTitles": update_data.get("desired_job_titles"),
        "desiredCities": update_data.get("desired_cities"),
        "salaryExpectation": update_data.get("salary_expectation"),
        "salaryCurrency": update_data.get("salary_currency"),
        "workPermitStatus": update_data.get("work_permit_status"),
        "summary": update_data.get("summary"),
        "extensibleData": {
            **(profile.extensibleData or {}),
            **(update_data.get("extensible_data") or {}),
        },
    }
    address = update_data.get("address")
    if address is not None:
        mapped["extensibleData"] = {**(mapped.get("extensibleData") or {}), "address": address}
    if profile_image_media_asset_id is not None:
        mapped["extensibleData"] = {
            **(mapped.get("extensibleData") or {}),
            "profile_image_asset_id": profile_image_media_asset_id,
        }
    clean_data = {key: value for key, value in mapped.items() if value is not None}
    if "extensibleData" in clean_data:
        clean_data["extensibleData"] = Json(clean_data["extensibleData"])
    updated = await db.candidateprofile.update(where={"id": profile.id}, data=clean_data)
    score = await refresh_profile_completion(candidate.id)
    return ok({"profile": updated.model_dump(mode="json"), "completion_score": score})


@router.get("/recruiter-search")
async def recruiter_search_candidates(
    q: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
    user: dict[str, str] = Depends(get_current_user),
) -> dict:
    if not x_company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company scope is required")
    permissions = await db.query_raw(
        """
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.company_id = $1::uuid
          AND ur.user_id = $2::uuid
          AND p.key = 'applications:read'
        LIMIT 1
        """,
        x_company_id,
        user["id"],
    )
    if not permissions:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    if not await company_has_candidate_search_access(x_company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter candidate search is available only with a premium entitlement.",
        )

    category_term = None
    if category_id:
        category_rows = await db.query_raw(
            """
            SELECT
              jc.slug,
              COALESCE(tt.name, initcap(replace(jc.slug, '-', ' '))) AS name
            FROM job_categories jc
            LEFT JOIN taxonomy_translations tt
              ON tt.entity_type = 'CATEGORY'
             AND tt.entity_id = jc.id
             AND tt.locale::text = 'en'
            WHERE jc.id = $1::uuid
            LIMIT 1
            """,
            category_id,
        )
        if category_rows:
            category_term = f"{category_rows[0]['name']} {category_rows[0]['slug']}"

    total_rows = await db.query_raw(
        """
        SELECT count(*)::int AS total
        FROM candidates c
        JOIN candidate_profiles cp ON cp.candidate_id = c.id
        WHERE c.deleted_at IS NULL
          AND (
            $1::text IS NULL
            OR lower(cp.full_name) LIKE '%' || lower($1::text) || '%'
            OR lower(coalesce(cp.summary, '')) LIKE '%' || lower($1::text) || '%'
            OR EXISTS (
              SELECT 1 FROM unnest(cp.desired_job_titles) dj
              WHERE lower(dj) LIKE '%' || lower($1::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_skills cs
              WHERE cs.candidate_profile_id = cp.id
                AND lower(cs.name) LIKE '%' || lower($1::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_experiences ce
              WHERE ce.candidate_profile_id = cp.id
                AND lower(ce.job_title) LIKE '%' || lower($1::text) || '%'
            )
          )
          AND (
            $2::text IS NULL
            OR EXISTS (
              SELECT 1 FROM unnest(cp.desired_job_titles) dj
              WHERE lower(dj) LIKE '%' || lower($2::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_skills cs
              WHERE cs.candidate_profile_id = cp.id
                AND lower(cs.name) LIKE '%' || lower($2::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_experiences ce
              WHERE ce.candidate_profile_id = cp.id
                AND lower(ce.job_title) LIKE '%' || lower($2::text) || '%'
            )
          )
        """,
        q,
        category_term,
    )
    total = int(total_rows[0]["total"]) if total_rows else 0
    rows = await db.query_raw(
        """
        SELECT
          c.id AS candidate_id,
          cp.id AS profile_id,
          cp.full_name,
          cp.nationality,
          cp.current_country,
          cp.current_city,
          cp.summary,
          cp.profile_completion_score,
          cp.desired_job_titles,
          cp.extensible_data,
          COALESCE(
            ARRAY(
              SELECT DISTINCT cs.name
              FROM candidate_skills cs
              WHERE cs.candidate_profile_id = cp.id
              ORDER BY cs.name ASC
              LIMIT 8
            ),
            ARRAY[]::text[]
          ) AS skills,
          COALESCE(
            (
              SELECT round(sum(
                CASE
                  WHEN ce.start_date IS NULL THEN 0
                  ELSE GREATEST(
                    0,
                    EXTRACT(EPOCH FROM (COALESCE(ce.end_date, current_date::timestamp) - ce.start_date))
                  )
                END
              ) / 31557600.0)
              FROM candidate_experiences ce
              WHERE ce.candidate_profile_id = cp.id
            ),
            0
          )::int AS years_experience
        FROM candidates c
        JOIN candidate_profiles cp ON cp.candidate_id = c.id
        WHERE c.deleted_at IS NULL
          AND (
            $1::text IS NULL
            OR lower(cp.full_name) LIKE '%' || lower($1::text) || '%'
            OR lower(coalesce(cp.summary, '')) LIKE '%' || lower($1::text) || '%'
            OR EXISTS (
              SELECT 1 FROM unnest(cp.desired_job_titles) dj
              WHERE lower(dj) LIKE '%' || lower($1::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_skills cs
              WHERE cs.candidate_profile_id = cp.id
                AND lower(cs.name) LIKE '%' || lower($1::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_experiences ce
              WHERE ce.candidate_profile_id = cp.id
                AND lower(ce.job_title) LIKE '%' || lower($1::text) || '%'
            )
          )
          AND (
            $2::text IS NULL
            OR EXISTS (
              SELECT 1 FROM unnest(cp.desired_job_titles) dj
              WHERE lower(dj) LIKE '%' || lower($2::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_skills cs
              WHERE cs.candidate_profile_id = cp.id
                AND lower(cs.name) LIKE '%' || lower($2::text) || '%'
            )
            OR EXISTS (
              SELECT 1
              FROM candidate_experiences ce
              WHERE ce.candidate_profile_id = cp.id
                AND lower(ce.job_title) LIKE '%' || lower($2::text) || '%'
            )
          )
        ORDER BY cp.profile_completion_score DESC, cp.updated_at DESC
        LIMIT $3::int OFFSET $4::int
        """,
        q,
        category_term,
        page_size,
        (page - 1) * page_size,
    )
    items = []
    for row in rows:
        items.append(
            {
                "candidate_id": str(row["candidate_id"]),
                "profile_id": str(row["profile_id"]),
                "full_name": str(row["full_name"]),
                "nationality": row["nationality"],
                "location": ", ".join(
                    [part for part in [row["current_city"], row["current_country"]] if isinstance(part, str) and part]
                ),
                "summary": row["summary"],
                "desired_job_titles": row["desired_job_titles"] or [],
                "skills": list(row["skills"] or []),
                "years_experience": int(row["years_experience"] or 0),
                "profile_completion_score": int(row["profile_completion_score"] or 0),
                "has_profile_photo": _extract_profile_image_asset_id(row["extensible_data"]) is not None,
            }
        )
    return ok({"items": items, "total": total, "page": page, "page_size": page_size, "premium_enabled": True})


@router.get("/recruiter-view/{candidate_id}")
async def recruiter_view_candidate(
    candidate_id: str,
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
    user: dict[str, str] = Depends(get_current_user),
) -> dict:
    if not x_company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company scope is required")
    permissions = await db.query_raw(
        """
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.company_id = $1::uuid
          AND ur.user_id = $2::uuid
          AND p.key = 'applications:read'
        LIMIT 1
        """,
        x_company_id,
        user["id"],
    )
    if not permissions:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    if not await company_has_candidate_search_access(x_company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter candidate search is available only with a premium entitlement.",
        )

    candidate = await db.candidate.find_unique(where={"id": candidate_id}, include={"profile": True})
    if candidate is None or candidate.profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    profile = candidate.profile
    skills = await db.candidateskill.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "asc"})
    experiences = await db.candidateexperience.find_many(where={"candidateProfileId": profile.id}, order={"startDate": "desc"})
    education = await db.candidateeducation.find_many(where={"candidateProfileId": profile.id}, order={"startDate": "desc"})
    certifications = await db.candidatecertification.find_many(where={"candidateProfileId": profile.id}, order={"issuedAt": "desc"})
    languages = await db.candidatelanguage.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "asc"})
    documents = await db.candidatedocument.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "desc"})

    profile_image_url = None
    profile_image_asset_id = _extract_profile_image_asset_id(profile.extensibleData)
    if profile_image_asset_id:
        asset = await db.mediaasset.find_unique(where={"id": profile_image_asset_id})
        settings = get_settings()
        if asset is not None and settings.r2_public_url:
            profile_image_url = f"{settings.r2_public_url.rstrip('/')}/{asset.objectKey}"

    return ok(
        {
            "candidate_id": candidate.id,
            "profile": {
                "full_name": profile.fullName,
                "headline": profile.summary,
                "nationality": profile.nationality,
                "current_country": profile.currentCountry,
                "current_city": profile.currentCity,
                "desired_job_titles": profile.desiredJobTitles,
                "desired_cities": profile.desiredCities,
                "profile_completion_score": candidate.profileCompletionScore,
                "profile_image_url": profile_image_url,
                "hsk_level": profile.hskLevel,
                "english_proficiency_type": profile.englishProficiencyType,
                "english_score_overall": float(profile.englishScoreOverall) if profile.englishScoreOverall else None,
                "contact": {"email": None, "phone": None, "locked": True},
            },
            "skills": [item.model_dump(mode="json") for item in skills],
            "experiences": [item.model_dump(mode="json") for item in experiences],
            "education": [item.model_dump(mode="json") for item in education],
            "certifications": [item.model_dump(mode="json") for item in certifications],
            "languages": [item.model_dump(mode="json") for item in languages],
            "documents": [item.model_dump(mode="json") for item in documents],
        }
    )


@router.get("/education")
async def list_education(user: dict[str, str] = Depends(get_current_user)) -> dict:
    _, profile = await _get_profile(user["id"])
    rows = await db.candidateeducation.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "desc"})
    return ok([x.model_dump(mode="json") for x in rows])


@router.post("/education")
async def create_education(payload: EducationIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateeducation.create(
        data={
            "candidateProfile": {"connect": {"id": profile.id}},
            "institution": payload.institution,
            "degree": payload.degree,
            "degreeType": payload.degree_type,
            "fieldOfStudy": payload.field_of_study,
            "startDate": _normalize_datetime_input(payload.start_date),
            "endDate": _normalize_datetime_input(payload.end_date),
            "isOngoing": payload.is_ongoing,
            "passingYear": payload.passing_year,
            "cgpa": payload.cgpa,
            "country": payload.country,
            "grade": payload.grade,
            "description": payload.description,
        }
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": row.model_dump(mode="json"), "completion_score": score})


@router.put("/education/{education_id}")
async def update_education(education_id: str, payload: EducationIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateeducation.find_unique(where={"id": education_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Education entry not found")
    updated = await db.candidateeducation.update(
        where={"id": education_id},
        data={
            "institution": payload.institution,
            "degree": payload.degree,
            "degreeType": payload.degree_type,
            "fieldOfStudy": payload.field_of_study,
            "startDate": _normalize_datetime_input(payload.start_date),
            "endDate": _normalize_datetime_input(payload.end_date),
            "isOngoing": payload.is_ongoing,
            "passingYear": payload.passing_year,
            "cgpa": payload.cgpa,
            "country": payload.country,
            "grade": payload.grade,
            "description": payload.description,
        },
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": updated.model_dump(mode="json"), "completion_score": score})


@router.delete("/education/{education_id}")
async def delete_education(education_id: str, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateeducation.find_unique(where={"id": education_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Education entry not found")
    await db.candidateeducation.delete(where={"id": education_id})
    score = await refresh_profile_completion(candidate.id)
    return ok({"deleted": True, "completion_score": score})


@router.get("/experience")
async def list_experience(user: dict[str, str] = Depends(get_current_user)) -> dict:
    _, profile = await _get_profile(user["id"])
    rows = await db.candidateexperience.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "desc"})
    return ok([x.model_dump(mode="json") for x in rows])


@router.post("/experience")
async def create_experience(payload: ExperienceIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateexperience.create(
        data={
            "candidateProfile": {"connect": {"id": profile.id}},
            "companyName": payload.company_name,
            "jobTitle": payload.job_title,
            "employmentType": payload.employment_type,
            "startDate": _normalize_datetime_input(payload.start_date),
            "endDate": _normalize_datetime_input(payload.end_date),
            "isCurrent": payload.is_current,
            "locationCity": payload.location_city,
            "locationCountry": payload.location_country,
            "description": payload.description,
        }
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": row.model_dump(mode="json"), "completion_score": score})


@router.put("/experience/{experience_id}")
async def update_experience(experience_id: str, payload: ExperienceIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateexperience.find_unique(where={"id": experience_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience entry not found")
    updated = await db.candidateexperience.update(
        where={"id": experience_id},
        data={
            "companyName": payload.company_name,
            "jobTitle": payload.job_title,
            "employmentType": payload.employment_type,
            "startDate": _normalize_datetime_input(payload.start_date),
            "endDate": _normalize_datetime_input(payload.end_date),
            "isCurrent": payload.is_current,
            "locationCity": payload.location_city,
            "locationCountry": payload.location_country,
            "description": payload.description,
        },
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": updated.model_dump(mode="json"), "completion_score": score})


@router.delete("/experience/{experience_id}")
async def delete_experience(experience_id: str, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateexperience.find_unique(where={"id": experience_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience entry not found")
    await db.candidateexperience.delete(where={"id": experience_id})
    score = await refresh_profile_completion(candidate.id)
    return ok({"deleted": True, "completion_score": score})


@router.get("/skills")
async def list_skills(user: dict[str, str] = Depends(get_current_user)) -> dict:
    _, profile = await _get_profile(user["id"])
    rows = await db.candidateskill.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "desc"})
    return ok([x.model_dump(mode="json") for x in rows])


@router.post("/skills")
async def create_skill(payload: SkillIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateskill.create(
        data={
            "candidateProfile": {"connect": {"id": profile.id}},
            "name": payload.name,
            "level": payload.level,
            "yearsOfExperience": payload.years_of_experience,
        }
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": row.model_dump(mode="json"), "completion_score": score})


@router.put("/skills/{skill_id}")
async def update_skill(skill_id: str, payload: SkillIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateskill.find_unique(where={"id": skill_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill entry not found")
    updated = await db.candidateskill.update(
        where={"id": skill_id},
        data={"name": payload.name, "level": payload.level, "yearsOfExperience": payload.years_of_experience},
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": updated.model_dump(mode="json"), "completion_score": score})


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidateskill.find_unique(where={"id": skill_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill entry not found")
    await db.candidateskill.delete(where={"id": skill_id})
    score = await refresh_profile_completion(candidate.id)
    return ok({"deleted": True, "completion_score": score})


@router.get("/certifications")
async def list_certifications(user: dict[str, str] = Depends(get_current_user)) -> dict:
    _, profile = await _get_profile(user["id"])
    rows = await db.candidatecertification.find_many(
        where={"candidateProfileId": profile.id}, order={"createdAt": "desc"}
    )
    return ok([x.model_dump(mode="json") for x in rows])


@router.get("/languages")
async def list_languages(user: dict[str, str] = Depends(get_current_user)) -> dict:
    _, profile = await _get_profile(user["id"])
    rows = await db.candidatelanguage.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "desc"})
    return ok([x.model_dump(mode="json") for x in rows])


@router.post("/languages")
async def create_language(payload: LanguageIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatelanguage.create(
        data={
            "candidateProfile": {"connect": {"id": profile.id}},
            "language": payload.language,
            "proficiency": payload.proficiency,
            "certification": payload.certification,
        }
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": row.model_dump(mode="json"), "completion_score": score})


@router.put("/languages/{language_id}")
async def update_language(language_id: str, payload: LanguageIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatelanguage.find_unique(where={"id": language_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language entry not found")
    updated = await db.candidatelanguage.update(
        where={"id": language_id},
        data={
            "language": payload.language,
            "proficiency": payload.proficiency,
            "certification": payload.certification,
        },
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": updated.model_dump(mode="json"), "completion_score": score})


@router.delete("/languages/{language_id}")
async def delete_language(language_id: str, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatelanguage.find_unique(where={"id": language_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language entry not found")
    await db.candidatelanguage.delete(where={"id": language_id})
    score = await refresh_profile_completion(candidate.id)
    return ok({"deleted": True, "completion_score": score})


@router.post("/certifications")
async def create_certification(payload: CertificationIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatecertification.create(
        data={
            "candidateProfile": {"connect": {"id": profile.id}},
            "name": payload.name,
            "issuingOrg": payload.issuing_org,
            "issuedAt": _normalize_datetime_input(payload.issued_at),
            "expiresAt": _normalize_datetime_input(payload.expires_at),
            "credentialId": payload.credential_id,
            "credentialUrl": payload.credential_url,
        }
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": row.model_dump(mode="json"), "completion_score": score})


@router.put("/certifications/{certification_id}")
async def update_certification(
    certification_id: str, payload: CertificationIn, user: dict[str, str] = Depends(get_current_user)
) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatecertification.find_unique(where={"id": certification_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certification entry not found")
    updated = await db.candidatecertification.update(
        where={"id": certification_id},
        data={
            "name": payload.name,
            "issuingOrg": payload.issuing_org,
            "issuedAt": _normalize_datetime_input(payload.issued_at),
            "expiresAt": _normalize_datetime_input(payload.expires_at),
            "credentialId": payload.credential_id,
            "credentialUrl": payload.credential_url,
        },
    )
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": updated.model_dump(mode="json"), "completion_score": score})


@router.delete("/certifications/{certification_id}")
async def delete_certification(certification_id: str, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatecertification.find_unique(where={"id": certification_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certification entry not found")
    await db.candidatecertification.delete(where={"id": certification_id})
    score = await refresh_profile_completion(candidate.id)
    return ok({"deleted": True, "completion_score": score})


@router.get("/documents")
async def list_documents(user: dict[str, str] = Depends(get_current_user)) -> dict:
    _, profile = await _get_profile(user["id"])
    rows = await db.candidatedocument.find_many(
        where={"candidateProfileId": profile.id},
        order={"createdAt": "desc"},
        include={"mediaAsset": True},
    )
    return ok([x.model_dump(mode="json") for x in rows])


@router.post("/documents")
async def create_document(payload: DocumentIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    await _ensure_media_owner(user["id"], payload.media_asset_id)
    data: dict[str, Any] = {
        "candidateProfile": {"connect": {"id": profile.id}},
        "documentType": payload.document_type,
        "title": payload.title,
        "languageCode": payload.language_code,
        "issuedAt": _normalize_datetime_input(payload.issued_at),
        "expiresAt": _normalize_datetime_input(payload.expires_at),
        "metadata": Json(payload.metadata) if payload.metadata is not None else None,
    }
    if payload.media_asset_id:
        data["mediaAsset"] = {"connect": {"id": payload.media_asset_id}}
    row = await db.candidatedocument.create(data=data)
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": row.model_dump(mode="json"), "completion_score": score})


@router.put("/documents/{document_id}")
async def update_document(document_id: str, payload: DocumentIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatedocument.find_unique(where={"id": document_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document entry not found")
    await _ensure_media_owner(user["id"], payload.media_asset_id)
    update_data: dict[str, Any] = {
        "documentType": payload.document_type,
        "title": payload.title,
        "languageCode": payload.language_code,
        "issuedAt": _normalize_datetime_input(payload.issued_at),
        "expiresAt": _normalize_datetime_input(payload.expires_at),
        "metadata": Json(payload.metadata) if payload.metadata is not None else None,
    }
    update_data["mediaAsset"] = {"connect": {"id": payload.media_asset_id}} if payload.media_asset_id else {"disconnect": True}
    updated = await db.candidatedocument.update(where={"id": document_id}, data=update_data)
    score = await refresh_profile_completion(candidate.id)
    return ok({"item": updated.model_dump(mode="json"), "completion_score": score})


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate, profile = await _get_profile(user["id"])
    row = await db.candidatedocument.find_unique(where={"id": document_id})
    if row is None or row.candidateProfileId != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document entry not found")
    if row.documentType.upper() == "PASSPORT":
        # Passport metadata is sensitive; only the owner endpoint can mutate it.
        pass
    await db.candidatedocument.delete(where={"id": document_id})
    score = await refresh_profile_completion(candidate.id)
    return ok({"deleted": True, "completion_score": score})


@router.post("/claim/{token}")
async def claim_placeholder(token: str, user: dict[str, str] = Depends(get_current_user)) -> dict:
    claim = await db.candidateclaimtoken.find_unique(where={"token": token})
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim token not found")
    return ok({"placeholder": True, "token": token, "claimer_user_id": user["id"]})
