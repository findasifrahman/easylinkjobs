from fastapi import APIRouter

from app.api.v1.endpoints import ai, admin, applications, auth, billing, candidates, companies, content, ingest, jobs, media, public, tracking, users

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(candidates.router, prefix="/candidate", tags=["candidates"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(content.router, prefix="/content", tags=["content"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["tracking"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
