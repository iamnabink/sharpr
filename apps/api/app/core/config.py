import contextlib
import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PLACEHOLDER_SECRETS = {"", "change-me", "changeme", "dev-secret-change-me"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://sharpr:sharpr@localhost:5432/sharpr"
    # Leave empty (or "change-me") and a random key is generated on first boot and stored in
    # <data_dir>/secret_key, like n8n's encryption key. Set it explicitly for multi-node setups.
    secret_key: str = ""
    data_dir: str = "./data"
    access_token_days: int = 30
    allow_registration: bool = True
    cors_origins: str = "http://localhost:3000"
    cookie_name: str = "sharpr_session"
    cookie_secure: bool = False

    storage_backend: str = "local"  # local | s3
    storage_local_path: str = "./data/recordings"  # keep under data_dir so one volume holds everything
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


def _resolve_secret_key(s: Settings) -> str:
    if s.secret_key.strip() not in PLACEHOLDER_SECRETS:
        return s.secret_key.strip()
    key_file = Path(s.data_dir) / "secret_key"
    if key_file.exists():
        existing = key_file.read_text().strip()
        if existing:
            return existing
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key = secrets.token_urlsafe(48)
    key_file.write_text(key)
    with contextlib.suppress(OSError):
        key_file.chmod(0o600)
    print(f"SECRET_KEY not set; generated one and saved it to {key_file}")
    return key


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.secret_key = _resolve_secret_key(s)
    return s
