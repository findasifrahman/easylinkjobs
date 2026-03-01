from typing import Any

from pydantic import BaseModel


class TrackingEventIn(BaseModel):
    event_name: str
    session_id: str | None = None
    anonymous_id: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    utm_term: str | None = None
    referrer: str | None = None
    page_url: str | None = None
    properties: dict[str, Any] | None = None
