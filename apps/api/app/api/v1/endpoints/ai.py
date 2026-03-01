import asyncio
import json
from datetime import UTC, datetime
from urllib import error, request

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from prisma import Json

from app.core.authz import get_current_user
from app.core.config import get_settings
from app.core.db import db
from app.core.redis_client import get_redis
from app.core.responses import ok
from app.services.encryption import decrypt_text, encrypt_text

router = APIRouter()


class StoreOpenAIKeyIn(BaseModel):
    openai_api_key: str = Field(min_length=20)


class GenerateCvIn(BaseModel):
    target_role: str | None = None
    translate_to_chinese: bool = False
    openai_api_key: str | None = None
    use_stored_key: bool = True
    store_key: bool = False


class ChatIn(BaseModel):
    message: str
    locale: str = "en"
    context: dict | None = None


async def _call_openai(api_key: str, system_prompt: str, user_prompt: str) -> str:
    payload = json.dumps(
        {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
            "max_tokens": 900,
        }
    ).encode()

    def _send() -> str:
        req = request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as response:
                body = json.loads(response.read().decode())
        except error.HTTPError as exc:
            detail = exc.read().decode()
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"OpenAI request failed: {detail}") from exc
        except error.URLError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OpenAI request failed") from exc

        try:
            return body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid OpenAI response") from exc

    return await asyncio.to_thread(_send)


async def _get_candidate_export(user_id: str) -> dict:
    candidate = await db.candidate.find_unique(where={"userId": user_id}, include={"profile": True})
    if candidate is None or candidate.profile is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate profile required")
    profile = candidate.profile
    education = await db.candidateeducation.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "asc"})
    experience = await db.candidateexperience.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "asc"})
    skills = await db.candidateskill.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "asc"})
    certifications = await db.candidatecertification.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "asc"})
    documents = await db.candidatedocument.find_many(where={"candidateProfileId": profile.id}, order={"createdAt": "asc"})
    return {
        "candidate": {
            "id": candidate.id,
            "status": candidate.status,
            "profile_completion_score": candidate.profileCompletionScore,
        },
        "profile": profile.model_dump(mode="json"),
        "education": [item.model_dump(mode="json") for item in education],
        "experience": [item.model_dump(mode="json") for item in experience],
        "skills": [item.model_dump(mode="json") for item in skills],
        "certifications": [item.model_dump(mode="json") for item in certifications],
        "documents": [item.model_dump(mode="json") for item in documents],
    }


async def _resolve_api_key(user_id: str, payload: GenerateCvIn) -> str:
    if payload.openai_api_key:
        if payload.store_key:
            encrypted = encrypt_text(payload.openai_api_key)
            await db.useraikeycredential.upsert(
                where={"userId": user_id},
                data={
                    "create": {"user": {"connect": {"id": user_id}}, "provider": "openai", "encryptedSecret": encrypted},
                    "update": {"encryptedSecret": encrypted},
                },
            )
        return payload.openai_api_key

    if payload.use_stored_key:
        stored = await db.useraikeycredential.find_unique(where={"userId": user_id})
        if stored is not None:
            return decrypt_text(stored.encryptedSecret)

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OpenAI API key required")


async def _enforce_cv_limit(user_id: str) -> None:
    settings = get_settings()
    redis = get_redis()
    day_key = datetime.now(UTC).strftime("%Y%m%d")
    cache_key = f"ai:cv:{user_id}:{day_key}"
    if redis is not None:
      count = await redis.incr(cache_key)
      if count == 1:
          await redis.expire(cache_key, 60 * 60 * 24)
      if count > settings.ai_cv_daily_limit:
          raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Daily AI CV limit reached")
      return

    rows = await db.query_raw(
        """
        SELECT count(*)::int AS c
        FROM ai_usage_events
        WHERE user_id = $1::uuid
          AND action = 'cv_generate'
          AND created_at >= date_trunc('day', now())
        """,
        user_id,
    )
    count = int(rows[0]["c"]) if rows else 0
    if count >= settings.ai_cv_daily_limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Daily AI CV limit reached")


async def _record_ai_usage(user_id: str, action: str, estimated_units: int, success: bool, metadata: dict | None = None) -> None:
    await db.aiusageevent.create(
        data={
            "user": {"connect": {"id": user_id}},
            "action": action,
            "estimatedUnits": estimated_units,
            "success": success,
            "metadata": Json(metadata) if metadata is not None else None,
        }
    )


@router.post("/keys/openai")
async def store_openai_key(payload: StoreOpenAIKeyIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    encrypted = encrypt_text(payload.openai_api_key)
    item = await db.useraikeycredential.upsert(
        where={"userId": user["id"]},
        data={
            "create": {"user": {"connect": {"id": user["id"]}}, "provider": "openai", "encryptedSecret": encrypted},
            "update": {"encryptedSecret": encrypted},
        },
    )
    return ok({"stored": True, "provider": item.provider})


@router.delete("/keys/openai")
async def delete_openai_key(user: dict[str, str] = Depends(get_current_user)) -> dict:
    existing = await db.useraikeycredential.find_unique(where={"userId": user["id"]})
    if existing is not None:
        await db.useraikeycredential.delete(where={"id": existing.id})
    return ok({"deleted": True})


@router.post("/cv/generate")
async def generate_cv(payload: GenerateCvIn, user: dict[str, str] = Depends(get_current_user)) -> dict:
    await _enforce_cv_limit(user["id"])
    export = await _get_candidate_export(user["id"])
    api_key = await _resolve_api_key(user["id"], payload)
    role_hint = payload.target_role or export["profile"].get("desiredJobTitles", ["China-ready professional CV"])[0]
    system_prompt = (
        "You write concise, professional CVs for China-facing recruiters. "
        "Use structured sections, measurable impact, ATS-friendly formatting, and no fabricated claims."
    )
    user_prompt = (
        f"Create a China-standard CV for role: {role_hint}.\n"
        f"If translate_to_chinese is true, append a Chinese translation summary.\n"
        f"translate_to_chinese={payload.translate_to_chinese}\n"
        f"Candidate data:\n{json.dumps(export, ensure_ascii=False)}"
    )
    try:
        cv_markdown = await _call_openai(api_key, system_prompt, user_prompt)
        await _record_ai_usage(
            user["id"],
            "cv_generate",
            estimated_units=max(200, len(user_prompt) // 3),
            success=True,
            metadata={"translate_to_chinese": payload.translate_to_chinese, "target_role": role_hint},
        )
    except HTTPException:
        await _record_ai_usage(
            user["id"],
            "cv_generate",
            estimated_units=max(100, len(user_prompt) // 4),
            success=False,
            metadata={"translate_to_chinese": payload.translate_to_chinese, "target_role": role_hint},
        )
        raise
    return ok({"cv_markdown": cv_markdown, "export": export})


@router.post("/chat")
async def chat(payload: ChatIn) -> dict:
    locale = payload.locale.lower()
    message = payload.message.strip()
    lower = message.lower()
    terms = [term for term in lower.replace(",", " ").split() if len(term) >= 3][:5]

    job_where: dict = {"isPublished": True, "deletedAt": None}
    if "shanghai" in lower:
        job_where["city"] = "Shanghai"
    elif "hangzhou" in lower:
        job_where["city"] = "Hangzhou"
    elif "shenzhen" in lower:
        job_where["city"] = "Shenzhen"
    jobs = await db.job.find_many(where=job_where, order={"createdAt": "desc"}, take=3)
    blog_items = await db.blogpost.find_many(where={"isPublished": True, "deletedAt": None}, order={"publishedAt": "desc"}, take=3)
    tutorial_items = await db.tutorial.find_many(where={"isPublished": True, "deletedAt": None}, order={"publishedAt": "desc"}, take=3)

    job_matches = [job for job in jobs if not terms or any(term in f"{job.title} {job.city} {job.country}".lower() for term in terms)]
    blog_matches = [item for item in blog_items if any(term in f"{item.title} {item.excerpt or ''}".lower() for term in terms)] if terms else blog_items
    tutorial_matches = [item for item in tutorial_items if any(term in f"{item.title} {item.summary or ''}".lower() for term in terms)] if terms else tutorial_items

    if locale == "zh":
        intro = "我找到了与你的问题最相关的内容："
    elif locale == "bn":
        intro = "আপনার প্রশ্নের সাথে সবচেয়ে কাছাকাছি ফলাফলগুলো হলো:"
    else:
        intro = "Here are the most relevant results I found:"

    lines = [intro]
    if job_matches:
        lines.append("Jobs: " + "; ".join(f"{job.title} ({job.city})" for job in job_matches[:2]))
    if blog_matches:
        lines.append("Blog: " + "; ".join(item.title for item in blog_matches[:2]))
    if tutorial_matches:
        lines.append("Tutorials: " + "; ".join(item.title for item in tutorial_matches[:2]))
    if len(lines) == 1:
        lines.append("Try asking about a city, visa sponsorship, tutorials, or blog updates.")

    return ok({"reply": " ".join(lines), "locale": locale, "stub": False})


@router.get("/export/candidate-profile")
async def export_candidate_profile(user: dict[str, str] = Depends(get_current_user)) -> dict:
    return ok(await _get_candidate_export(user["id"]))


@router.get("/export/jobs/{job_id}")
async def export_job(job_id: str) -> dict:
    job = await db.job.find_unique(
        where={"id": job_id},
        include={"company": True, "locations": True, "languageRequirements": True, "allowedNationalities": True},
    )
    if job is None or not job.isPublished:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return ok(job.model_dump(mode="json"))
