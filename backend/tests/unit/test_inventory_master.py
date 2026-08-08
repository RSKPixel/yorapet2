"""Unit tests for inventory image URL helper."""

from __future__ import annotations

from datetime import UTC, datetime

from app.services.inventory_master_service import image_url_for


def test_image_url_for_includes_image_id() -> None:
    assert image_url_for(42) == "/api/v1/inventory-master/image?image_id=42"


def test_image_url_for_includes_cache_buster() -> None:
    updated = datetime(2026, 7, 29, 10, 0, 0, tzinfo=UTC)
    url = image_url_for(7, updated_at=updated)
    assert url.startswith("/api/v1/inventory-master/image?image_id=7&t=")
