from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="easylinkjobs-api", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    cors_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", alias="CORS_ORIGINS")

    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")

    jwt_secret: str = Field(default="", alias="JWT_SECRET")
    jwt_refresh_secret: str = Field(default="", alias="JWT_REFRESH_SECRET")
    jwt_access_expires: str = Field(default="24h", alias="JWT_ACCESS_EXPIRES")
    jwt_refresh_expires: str = Field(default="14d", alias="JWT_REFRESH_EXPIRES")
    field_encryption_key: str | None = Field(default=None, alias="FIELD_ENCRYPTION_KEY")
    ai_cv_daily_limit: int = Field(default=5, alias="AI_CV_DAILY_LIMIT")
    ingestion_api_key: str | None = Field(default=None, alias="INGESTION_API_KEY")
    ingestion_rate_limit_per_minute: int = Field(default=60, alias="INGESTION_RATE_LIMIT_PER_MINUTE")

    r2_endpoint: str | None = Field(default=None, alias="R2_ENDPOINT")
    r2_account_id: str | None = Field(default=None, alias="R2_ACCOUNT_ID")
    r2_access_key_id: str | None = Field(default=None, alias="R2_ACCESS_KEY_ID")
    r2_secret_access_key: str | None = Field(default=None, alias="R2_SECRET_ACCESS_KEY")
    r2_bucket: str = Field(default="easylinkjobs", alias="R2_BUCKET")
    r2_public_url: str | None = Field(default=None, alias="R2_PUBLIC_URL")

    permission_cache_ttl: int = Field(default=120, alias="PERMISSION_CACHE_TTL")
    disable_rate_limits: bool = Field(default=False, alias="DISABLE_RATE_LIMITS")

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
