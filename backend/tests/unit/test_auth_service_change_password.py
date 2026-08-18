"""Unit tests for AuthService.change_password."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.core.exceptions import AppError
from app.core.security import hash_password
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_change_password_success() -> None:
    user = SimpleNamespace(
        password_hash=hash_password("old-password-1"),
        auth_version=1,
    )
    users = SimpleNamespace(
        set_password_hash=AsyncMock(),
        increment_auth_version=AsyncMock(),
    )
    service = AuthService(users)  # type: ignore[arg-type]

    updated = await service.change_password(
        user,  # type: ignore[arg-type]
        current_password="old-password-1",
        new_password="new-password-1",
    )

    assert updated is user
    users.set_password_hash.assert_awaited_once()
    users.increment_auth_version.assert_awaited_once_with(user)


@pytest.mark.asyncio
async def test_change_password_rejects_wrong_current() -> None:
    user = SimpleNamespace(password_hash=hash_password("old-password-1"))
    users = SimpleNamespace(
        set_password_hash=AsyncMock(),
        increment_auth_version=AsyncMock(),
    )
    service = AuthService(users)  # type: ignore[arg-type]

    with pytest.raises(AppError) as exc_info:
        await service.change_password(
            user,  # type: ignore[arg-type]
            current_password="wrong-password",
            new_password="new-password-1",
        )

    assert exc_info.value.code == "invalid_current_password"
    users.set_password_hash.assert_not_awaited()


@pytest.mark.asyncio
async def test_change_password_rejects_same_password() -> None:
    user = SimpleNamespace(password_hash=hash_password("same-password-1"))
    users = SimpleNamespace(
        set_password_hash=AsyncMock(),
        increment_auth_version=AsyncMock(),
    )
    service = AuthService(users)  # type: ignore[arg-type]

    with pytest.raises(AppError) as exc_info:
        await service.change_password(
            user,  # type: ignore[arg-type]
            current_password="same-password-1",
            new_password="same-password-1",
        )

    assert exc_info.value.code == "password_unchanged"
    users.set_password_hash.assert_not_awaited()
