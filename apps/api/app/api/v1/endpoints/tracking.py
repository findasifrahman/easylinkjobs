from uuid import uuid4

from fastapi import APIRouter, Depends, Header, Request, Response
from prisma import Json

from app.core.db import db
from app.core.rate_limit import rate_limit
from app.core.responses import ok
from app.core.security import decode_access_token
from app.schemas.tracking import TrackingEventIn

router = APIRouter()


@router.post("/events", dependencies=[Depends(rate_limit(240, 60))])
async def ingest_event(
    payload: TrackingEventIn,
    response: Response,
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict:
    user_id: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            user_id = decode_access_token(token).get("sub")
        except Exception:
            user_id = None

    cookie_anonymous_id = request.cookies.get("anonymous_id")
    anonymous_id = payload.anonymous_id or cookie_anonymous_id or str(uuid4())
    session_id = payload.session_id or str(uuid4())
    if cookie_anonymous_id is None:
        response.set_cookie("anonymous_id", anonymous_id, max_age=60 * 60 * 24 * 365, httponly=False, samesite="lax")

    data: dict[str, object] = {
        "eventName": payload.event_name,
        "sessionId": session_id,
        "anonymousId": anonymous_id,
        "utmSource": payload.utm_source,
        "utmMedium": payload.utm_medium,
        "utmCampaign": payload.utm_campaign,
        "utmContent": payload.utm_content,
        "utmTerm": payload.utm_term,
        "referrer": payload.referrer,
        "pageUrl": payload.page_url,
    }
    if user_id:
        data["user"] = {"connect": {"id": user_id}}
    if payload.properties is not None:
        data["properties"] = Json(payload.properties)

    event = await db.trackingevent.create(data=data)
    return ok({"event_id": event.id, "anonymous_id": anonymous_id, "session_id": session_id, "forwarding": "placeholder"})
