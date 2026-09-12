from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://sharpr:sharpr@localhost:5432/sharpr"
    secret_key: str = "dev-secret-change-me"
    access_token_days: int = 30
    allow_registration: bool = True
    cors_origins: str = "http://localhost:3000"
    cookie_name: str = "sharpr_session"
    cookie_secure: bool = False

    storage_backend: str = "local"  # local | s3
    storage_local_path: str = "./data/recordings"
    s3_endpoint_url: str | None = None
    s3_bucket: str = "sharpr"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "us-east-1"

    seed_dir: str = "./seed"
    max_upload_mb: int = 500

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
