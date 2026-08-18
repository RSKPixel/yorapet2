"""Unit tests for configuration loading."""

from __future__ import annotations

from pathlib import Path

import pytest
from app.core.config import get_settings, resolve_env_file, resolve_env_files


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


def test_resolve_env_files_includes_local_when_present(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    jwt = "development-only-change-this-64-character-secret-before-deploying"
    base = tmp_path / ".env"
    base.write_text(f"APP_NAME=test\nJWT_SECRET_KEY={jwt}\n", encoding="utf-8")
    local = tmp_path / ".env.local"
    local.write_text("APP_NAME=override\n", encoding="utf-8")

    monkeypatch.setattr("app.core.config.BACKEND_ROOT", tmp_path)
    monkeypatch.setattr("app.core.config.resolve_env_file", lambda: base)

    files = resolve_env_files()
    assert files == (base, local)

    get_settings.cache_clear()
    settings = get_settings()
    assert settings.app_name == "override"
    get_settings.cache_clear()


def test_settings_load_from_env_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.app_name
    assert settings.api_v1_prefix.startswith("/")
    assert "mysql+" in settings.database_url
    get_settings.cache_clear()
