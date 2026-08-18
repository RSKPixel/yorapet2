"""Unit tests for UserService.create_user."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.core.exceptions import ConflictError
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_create_user_success() -> None:
    created = SimpleNamespace(id=2, username="clerk")
    users = SimpleNamespace(
        get_by_username=AsyncMock(return_value=None),
        create=AsyncMock(return_value=created),
    )
    service = UserService(users)  # type: ignore[arg-type]

    result = await service.create_user(
        username="clerk",
        display_name="Clerk",
        password="password123",
        role="user",
        is_active=True,
    )

    assert result is created
    users.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_user_rejects_duplicate_username() -> None:
    users = SimpleNamespace(
        get_by_username=AsyncMock(return_value=SimpleNamespace(id=1)),
        create=AsyncMock(),
    )
    service = UserService(users)  # type: ignore[arg-type]

    with pytest.raises(ConflictError):
        await service.create_user(
            username="admin",
            display_name="Admin",
            password="password123",
            role="admin",
            is_active=True,
        )

    users.create.assert_not_awaited()
