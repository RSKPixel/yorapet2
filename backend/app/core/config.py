"""Application configuration loaded from environment files."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import quote_plus

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def resolve_env_file() -> Path:
    """Select `.env` or `.env.production` from APP_ENV."""
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    filename = ".env.production" if app_env == "production" else ".env"
    return BACKEND_ROOT / filename


class Settings(BaseSettings):
    """Centralized application settings."""

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: Literal["development", "production"] = "development"
    app_name: str = "YoraPet API"
    app_version: str = "0.1.0"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    host: str = "0.0.0.0"
    port: int = 8000

    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "yorapet"
    mysql_password: str = "change-me"
    mysql_database: str = "yorapet"
    mysql_driver: str = "asyncmy"

    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_echo: bool = False

    cors_origins: str = "http://localhost:5173"
    cors_allow_credentials: bool = True

    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_expire_minutes: int = 24 * 60
    refresh_token_expire_days: int = 7
    auth_cookie_secure: bool = False
    admin_username: str | None = None
    admin_password: str | None = None
    admin_display_name: str = "Administrator"

    log_level: str = "INFO"
    log_format: Literal["console", "json"] = "console"
    upload_dir: Path = Field(default=BACKEND_ROOT / "uploads")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        user = quote_plus(self.mysql_user)
        password = quote_plus(self.mysql_password)
        return (
            f"mysql+{self.mysql_driver}://{user}:{password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance loaded from the active env file."""
    return Settings(_env_file=resolve_env_file())
