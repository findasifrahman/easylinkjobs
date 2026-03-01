from fastapi import APIRouter

router = APIRouter(prefix="/v1")


@router.get("/ping", tags=["system"])
def ping() -> dict[str, str]:
    return {"message": "pong"}
