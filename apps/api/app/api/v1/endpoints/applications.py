from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from prisma import Json

from app.core.authz import get_current_user, require_permission
from app.core.db import db
from app.core.responses import ok
from app.services.entitlements import company_has_contact_access

router = APIRouter()


class ApplyIn(BaseModel):
    job_id: str
    cover_letter: str | None = None
    screening_answers: dict | None = None


class StatusUpdateIn(BaseModel):
    status: str


class NoteIn(BaseModel):
    body: str
    is_private: bool = True


def _experience_years(experiences: list) -> int:
    total_days = 0
    today = datetime.now(UTC).date()
    for item in experiences:
        if item.startDate is None:
            continue
        start = item.startDate.date() if hasattr(item.startDate, "date") else item.startDate
        end_value = item.endDate.date() if item.endDate is not None and hasattr(item.endDate, "date") else item.endDate
        end = today if item.isCurrent or end_value is None else end_value
        if start and end and end >= start:
            total_days += (end - start).days
    return round(total_days / 365)


async def _serialize_applicant_summary(application, can_view_contact: bool) -> dict:
    candidate = await db.candidate.find_unique(
        where={"id": application.candidateId},
        include={
            "profile": True,
        },
    )
    if candidate is None:
        return {"application_id": application.id, "candidate_missing": True}
    profile = candidate.profile
    skill_rows = []
    experience_rows = []
    if profile is not None:
        skill_rows = await db.candidateskill.find_many(where={"candidateProfileId": profile.id}, take=8)
        experience_rows = await db.candidateexperience.find_many(where={"candidateProfileId": profile.id})

    contact = {
        "email": profile.email if profile else None,
        "phone": profile.phone if profile else None,
    }
    if not can_view_contact:
        contact = {"email": None, "phone": None, "locked": True}

    return {
        "application_id": application.id,
        "job_id": application.jobId,
        "status": application.status,
        "created_at": application.createdAt.isoformat(),
        "summary": {
            "name": profile.fullName if profile else application.candidateSnapshot.get("full_name") if application.candidateSnapshot else None,
            "nationality": profile.nationality if profile else None,
            "skills": [item.name for item in skill_rows],
            "years_experience": _experience_years(experience_rows),
            "completion_score": candidate.profileCompletionScore,
        },
        "contact": contact,
    }


@router.post("/apply")
async def apply(payload: ApplyIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    job = await db.job.find_unique(where={"id": payload.job_id})
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.applicationDeadline is not None and job.applicationDeadline < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application deadline has passed")
    candidate = await db.candidate.find_unique(where={"userId": user["id"]}, include={"profile": True})
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate profile required")
    snapshot = {
        "candidate_id": candidate.id,
        "full_name": candidate.profile.fullName if candidate.profile else None,
        "profile_completion_score": candidate.profileCompletionScore,
    }
    application = await db.application.upsert(
        where={"jobId_candidateId": {"jobId": payload.job_id, "candidateId": candidate.id}},
        data={
            "create": {
                "job": {"connect": {"id": payload.job_id}},
                "candidate": {"connect": {"id": candidate.id}},
                "status": "APPLIED",
                "candidateSnapshot": Json(snapshot),
                "coverLetter": payload.cover_letter,
                "screeningAnswers": Json(payload.screening_answers) if payload.screening_answers is not None else None,
            },
            "update": {
                "coverLetter": payload.cover_letter,
                "screeningAnswers": Json(payload.screening_answers) if payload.screening_answers is not None else None,
            },
        },
    )
    await db.applicationevent.create(
        data={
            "application": {"connect": {"id": application.id}},
            "actorUser": {"connect": {"id": user["id"]}},
            "statusFrom": None,
            "statusTo": application.status,
            "eventName": "application_submitted",
        }
    )
    return ok(application.model_dump(mode="json"))


@router.get("/mine")
async def list_my_applications(user: dict[str, str] = Depends(get_current_user)) -> dict:
    candidate = await db.candidate.find_unique(where={"userId": user["id"]})
    if candidate is None:
        return ok([])
    rows = await db.application.find_many(
        where={"candidateId": candidate.id},
        order={"createdAt": "desc"},
        include={"job": {"include": {"company": True}}},
        take=100,
    )
    items = []
    for row in rows:
        items.append(
            {
                "id": row.id,
                "status": row.status,
                "created_at": row.createdAt.isoformat(),
                "job": row.job.model_dump(mode="json") if row.job else None,
                "company": row.job.company.model_dump(mode="json") if row.job and row.job.company else None,
            }
        )
    return ok(items)


@router.get("/")
async def list_applications(_: None = Depends(require_permission("applications:read"))) -> dict:
    items = await db.application.find_many(order={"createdAt": "desc"}, take=100)
    return ok([x.model_dump(mode="json") for x in items])


@router.get("/company/{company_id}/overview")
async def company_applications_overview(
    company_id: str,
    _: None = Depends(require_permission("applications:read")),
) -> dict:
    jobs = await db.job.find_many(where={"companyId": company_id, "deletedAt": None})
    job_ids = [job.id for job in jobs]
    if not job_ids:
        return ok({"views": 0, "applies": 0, "shortlisted": 0})
    applies = await db.application.count(where={"jobId": {"in": job_ids}})
    shortlisted = await db.application.count(where={"jobId": {"in": job_ids}, "status": "SHORTLISTED"})
    rows = await db.query_raw(
        """
        SELECT count(*)::int AS c
        FROM tracking_events
        WHERE event_name = 'view_job'
          AND properties ->> 'jobId' = ANY($1::text[])
        """,
        job_ids,
    )
    views = int(rows[0]["c"]) if rows else 0
    return ok({"views": views, "applies": applies, "shortlisted": shortlisted})


@router.get("/company/{company_id}/applicants")
async def list_company_applicants(
    company_id: str,
    status_filter: str | None = None,
    job_id: str | None = None,
    _: None = Depends(require_permission("applications:read")),
) -> dict:
    job_where: dict = {"companyId": company_id, "deletedAt": None}
    if job_id:
        job_where["id"] = job_id
    jobs = await db.job.find_many(where=job_where)
    job_ids = [job.id for job in jobs]
    if not job_ids:
        return ok({"items": [], "can_view_contact": False})
    app_where: dict = {"jobId": {"in": job_ids}}
    if status_filter:
        app_where["status"] = status_filter
    applications = await db.application.find_many(where=app_where, order={"createdAt": "desc"}, take=200)
    can_view_contact = await company_has_contact_access(company_id)
    items = [await _serialize_applicant_summary(app, can_view_contact) for app in applications]
    return ok({"items": items, "can_view_contact": can_view_contact})


@router.get("/company/{company_id}/applicants/table")
async def list_company_applicants_table(
    company_id: str,
    status_filter: str | None = None,
    job_id: str | None = None,
    page: int = 1,
    page_size: int = 10,
    _: None = Depends(require_permission("applications:read")),
) -> dict:
    job_where: dict = {"companyId": company_id, "deletedAt": None}
    if job_id:
        job_where["id"] = job_id
    jobs = await db.job.find_many(where=job_where)
    job_ids = [job.id for job in jobs]
    if not job_ids:
        return ok({"items": [], "can_view_contact": False, "total": 0, "page": page, "page_size": page_size})
    app_where: dict = {"jobId": {"in": job_ids}}
    if status_filter:
        app_where["status"] = status_filter
    total = await db.application.count(where=app_where)
    applications = await db.application.find_many(
        where=app_where,
        order={"createdAt": "desc"},
        skip=(page - 1) * page_size,
        take=page_size,
    )
    can_view_contact = await company_has_contact_access(company_id)
    items = [await _serialize_applicant_summary(app, can_view_contact) for app in applications]
    return ok(
        {
            "items": items,
            "can_view_contact": can_view_contact,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.patch("/{application_id}/status")
async def change_status(
    application_id: str,
    payload: StatusUpdateIn,
    user: dict[str, str] = Depends(get_current_user),
    _: None = Depends(require_permission("applications:update")),
) -> dict:
    app = await db.application.find_unique(where={"id": application_id})
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    updated = await db.application.update(where={"id": app.id}, data={"status": payload.status})
    await db.applicationevent.create(
        data={
            "application": {"connect": {"id": app.id}},
            "actorUser": {"connect": {"id": user["id"]}},
            "statusFrom": app.status,
            "statusTo": payload.status,
            "eventName": "status_changed",
        }
    )
    return ok(updated.model_dump(mode="json"))


@router.post("/{application_id}/notes")
async def add_note(
    application_id: str,
    payload: NoteIn,
    user: dict[str, str] = Depends(get_current_user),
    _: None = Depends(require_permission("applications:update")),
) -> dict:
    note = await db.applicationnote.create(
        data={
            "application": {"connect": {"id": application_id}},
            "authorUser": {"connect": {"id": user["id"]}},
            "body": payload.body,
            "isPrivate": payload.is_private,
        }
    )
    return ok(note.model_dump(mode="json"))


@router.get("/{application_id}/notes")
async def list_notes(
    application_id: str,
    _: None = Depends(require_permission("applications:read")),
) -> dict:
    notes = await db.applicationnote.find_many(where={"applicationId": application_id}, order={"createdAt": "desc"}, take=100)
    return ok([note.model_dump(mode="json") for note in notes])
