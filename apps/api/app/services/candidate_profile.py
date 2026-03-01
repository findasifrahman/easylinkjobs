from collections.abc import Iterable
from typing import Any

from app.core.db import db


def _present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) > 0
    return True


def _score_fields(values: Iterable[Any]) -> int:
    items = list(values)
    if not items:
        return 0
    completed = sum(1 for item in items if _present(item))
    return round((completed / len(items)) * 100)


def calculate_profile_completion(
    *,
    profile: Any,
    education_count: int,
    experience_count: int,
    skill_count: int,
    certification_count: int,
    document_types: set[str],
) -> int:
    sections = [
        _score_fields(
            [
                getattr(profile, "fullName", None),
                getattr(profile, "dob", None),
                getattr(profile, "fatherName", None),
                getattr(profile, "motherName", None),
                getattr(profile, "phone", None),
                getattr(profile, "currentCountry", None),
                getattr(profile, "nationality", None),
            ]
        ),
        _score_fields(
            [
                getattr(profile, "everBeenToChina", None),
                getattr(profile, "everRejectedChina", None),
                getattr(profile, "chinaEducation", None),
                getattr(profile, "visaStatus", None),
            ]
        ),
        100 if education_count > 0 else 0,
        100 if experience_count > 0 and skill_count > 0 else 0,
        _score_fields(
            [
                getattr(profile, "hskLevel", None),
                getattr(profile, "englishProficiencyType", None),
                getattr(profile, "englishScoreOverall", None),
            ]
        ),
        _score_fields(
            [
                "PASSPORT" in document_types,
                "CV" in document_types,
                "COVER_LETTER" in document_types,
            ]
        ),
        _score_fields(
            [
                getattr(profile, "desiredJobTitles", []),
                getattr(profile, "desiredCities", []),
                getattr(profile, "salaryExpectation", None),
            ]
        ),
        100 if certification_count > 0 else 0,
    ]
    return round(sum(sections) / len(sections))


async def refresh_profile_completion(candidate_id: str) -> int:
    profile = await db.candidateprofile.find_unique(where={"candidateId": candidate_id})
    if profile is None:
        await db.candidate.update(where={"id": candidate_id}, data={"profileCompletionScore": 0})
        return 0
    education_count = await db.candidateeducation.count(where={"candidateProfileId": profile.id})
    experience_count = await db.candidateexperience.count(where={"candidateProfileId": profile.id})
    skill_count = await db.candidateskill.count(where={"candidateProfileId": profile.id})
    certification_count = await db.candidatecertification.count(where={"candidateProfileId": profile.id})
    documents = await db.candidatedocument.find_many(where={"candidateProfileId": profile.id})
    document_types = {item.documentType.upper() for item in documents}
    score = calculate_profile_completion(
        profile=profile,
        education_count=education_count,
        experience_count=experience_count,
        skill_count=skill_count,
        certification_count=certification_count,
        document_types=document_types,
    )
    await db.candidateprofile.update(
        where={"id": profile.id},
        data={"profileCompletionScore": score},
    )
    await db.candidate.update(where={"id": candidate_id}, data={"profileCompletionScore": score})
    return score
