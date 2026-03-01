from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.db import connect_db, disconnect_db
from app.core.redis_client import close_redis, init_redis
from app.core.responses import http_exception_handler, ok


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_db()
    await init_redis()
    try:
        yield
    finally:
        await close_redis()
        await disconnect_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        openapi_tags=[
            {"name": "auth", "description": "JWT auth and session management"},
            {"name": "rbac", "description": "Dynamic RBAC checks from DB"},
            {"name": "users", "description": "User profile endpoints"},
            {"name": "candidates", "description": "Candidate profile endpoints"},
            {"name": "companies", "description": "Company and membership endpoints"},
            {"name": "jobs", "description": "Job posting and public listing"},
            {"name": "content", "description": "Public blog and tutorial endpoints"},
            {"name": "applications", "description": "Apply and pipeline management"},
            {"name": "media", "description": "R2 signed upload and media metadata"},
            {"name": "tracking", "description": "Anonymous and logged event ingestion"},
            {"name": "ai", "description": "AI helpers, CV generation, export, and chat"},
            {"name": "billing", "description": "Premium plan and provider placeholders"},
            {"name": "ingest", "description": "Secure scraped-job ingestion"},
            {"name": "admin", "description": "Super admin and analytics endpoints"},
            {"name": "health", "description": "System health"},
        ],
    )
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.get("/healthz", tags=["health"])
    def healthcheck() -> dict:
        return ok({"status": "ok"})

    return app


app = create_app()
