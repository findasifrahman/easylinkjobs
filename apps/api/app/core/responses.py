from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


def ok(data: Any = None) -> dict[str, Any]:
    return {"ok": True, "data": data, "error": None}


def err(code: str, message: str, details: Any = None) -> dict[str, Any]:
    return {"ok": False, "data": None, "error": {"code": code, "message": message, "details": details}}


async def http_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", "internal_server_error")
    if isinstance(detail, dict):
        payload = err(
            detail.get("code", "http_error"),
            detail.get("message", "Request failed"),
            detail.get("details"),
        )
    else:
        payload = err("http_error", str(detail))
    return JSONResponse(status_code=status_code, content=payload)
