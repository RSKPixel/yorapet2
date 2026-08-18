"""Unit tests for CompanyProfileService."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.services.company_profile_service import CompanyProfileService


@pytest.mark.asyncio
async def test_get_profile_returns_singleton_profile() -> None:
    profile = SimpleNamespace(id=1)
    repository = SimpleNamespace(get_or_create=AsyncMock(return_value=profile))
    service = CompanyProfileService(repository)  # type: ignore[arg-type]

    result = await service.get_profile()

    assert result is profile
    repository.get_or_create.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_profile_persists_profile_fields() -> None:
    profile = SimpleNamespace(id=1)
    updated = SimpleNamespace(id=1, company_name="Yora Pet")
    repository = SimpleNamespace(
        get_or_create=AsyncMock(return_value=profile),
        update=AsyncMock(return_value=updated),
    )
    service = CompanyProfileService(repository)  # type: ignore[arg-type]

    result = await service.update_profile(
        company_name="Yora Pet",
        address="12 Market Road",
        area="Central",
        city="Chennai",
        pin="600001",
        email="office@example.com",
        phone="9876543210",
        gstin="33ABCDE1234F1Z5",
    )

    assert result is updated
    repository.update.assert_awaited_once_with(
        profile,
        company_name="Yora Pet",
        address="12 Market Road",
        area="Central",
        city="Chennai",
        pin="600001",
        email="office@example.com",
        phone="9876543210",
        gstin="33ABCDE1234F1Z5",
    )
