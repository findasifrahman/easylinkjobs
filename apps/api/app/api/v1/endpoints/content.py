from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import db
from app.core.responses import ok

router = APIRouter()


@router.get("/blog")
async def public_blog_list(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
) -> dict:
    where = {"isPublished": True, "deletedAt": None}
    total = await db.blogpost.count(where=where)
    items = await db.blogpost.find_many(
        where=where, order={"publishedAt": "desc"}, skip=(page - 1) * page_size, take=page_size
    )
    return ok(
        {
            "items": [item.model_dump(mode="json") for item in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/blog/{slug}")
async def public_blog_detail(slug: str) -> dict:
    item = await db.blogpost.find_first(where={"slug": slug, "isPublished": True, "deletedAt": None})
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found")
    return ok(item.model_dump(mode="json"))


@router.get("/tutorials")
async def public_tutorial_list(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
) -> dict:
    where = {"isPublished": True, "deletedAt": None}
    total = await db.tutorial.count(where=where)
    items = await db.tutorial.find_many(
        where=where, order={"publishedAt": "desc"}, skip=(page - 1) * page_size, take=page_size
    )
    return ok(
        {
            "items": [item.model_dump(mode="json") for item in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/tutorials/{slug}")
async def public_tutorial_detail(slug: str) -> dict:
    item = await db.tutorial.find_first(where={"slug": slug, "isPublished": True, "deletedAt": None})
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial not found")
    return ok(item.model_dump(mode="json"))
