from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.db import db
from app.core.redis_client import get_redis
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict[str, str]:
    payload = decode_access_token(credentials.credentials)
    user_id = payload["sub"]
    user = await db.user.find_unique(where={"id": user_id})
    if user is None or user.deletedAt is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"id": user.id, "email": user.email}


async def get_effective_permissions(user_id: str, company_id: str | None) -> set[str]:
    redis = get_redis()
    company_key = company_id if company_id else "global"
    cache_key = f"perm:{user_id}:{company_key}"
    if redis is not None:
        cached = await redis.smembers(cache_key)
        if cached:
            return set(cached)
    query = """
    SELECT DISTINCT p.key
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = $1::uuid
      AND (ur.company_id IS NULL OR ur.company_id = $2::uuid)
    """
    rows = await db.query_raw(query, user_id, company_id)
    permissions = {row["key"] for row in rows}
    if redis is not None and permissions:
        await redis.sadd(cache_key, *permissions)
        await redis.expire(cache_key, 120)
    return permissions


def require_permission(permission: str) -> Callable[..., None]:
    async def dependency(
        user: dict[str, str] = Depends(get_current_user),
        x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
    ) -> None:
        permissions = await get_effective_permissions(user["id"], x_company_id)
        if permission not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    return dependency
