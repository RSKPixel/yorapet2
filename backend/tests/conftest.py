"""Shared pytest fixtures."""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

# Ensure development env file is selected before settings are cached.
os.environ.setdefault("APP_ENV", "development")


@pytest.fixture()
def client() -> Iterator[TestClient]:
    from app.core.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    application = create_app()
    with TestClient(application) as test_client:
        yield test_client
    get_settings.cache_clear()
