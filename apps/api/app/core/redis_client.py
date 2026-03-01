from redis.asyncio import Redis

from app.core.config import get_settings

_redis: Redis | None = None


async def init_redis() -> None:
    global _redis
    settings = get_settings()
    if not settings.redis_url:
        return
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
        try:
            await _redis.ping()
        except Exception:
            _redis = None


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None


def get_redis() -> Redis | None:
    return _redis
