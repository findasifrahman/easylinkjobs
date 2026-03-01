from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.core.config import get_settings
from app.core.redis_client import get_redis


def rate_limit(limit: int, window_seconds: int) -> Callable[[Request], None]:
    async def dependency(request: Request) -> None:
        settings = get_settings()
        if settings.disable_rate_limits or settings.app_env.lower() == "development":
            return
        redis = get_redis()
        if redis is None:
            return
        key = f"rl:{request.url.path}:{request.client.host if request.client else 'unknown'}"
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, window_seconds)
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {limit}/{window_seconds}s",
            )

    return dependency
