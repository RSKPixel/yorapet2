"""Unit tests for configuration loading."""

from __future__ import annotations

import pytest
from app.core.config import get_settings, resolve_env_file


def test_resolve_env_file_defaults_to_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    path = resolve_env_file()
    assert path.name == ".env"


def test_resolve_env_file_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    path = resolve_env_file()
    assert path.name == ".env.production"


def test_settings_load_from_env_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.app_name
    assert settings.api_v1_prefix.startswith("/")
    assert "mysql+" in settings.database_url
    get_settings.cache_clear()
