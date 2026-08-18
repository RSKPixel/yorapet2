"""Unit tests for UserService.update_user."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from app.core.exceptions import AppError, NotFoundError
from app.services.user_service import UserService


def _user(**overrides: object) -> SimpleNamespace:
    base = {
        "id": 2,
        "role": "user",
        "is_active": True,
        "auth_version": 1,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.mark.asyncio
async def test_update_user_role_and_status() -> None:
    target = _user()
    actor = _user(id=1, role="admin")
    updated = _user(role="admin", is_active=False)
    users = SimpleNamespace(
        get_by_id=AsyncMock(return_value=target),
        count_active_admins=AsyncMock(return_value=1),
        update_role_and_status=AsyncMock(return_value=updated),
        increment_auth_version=AsyncMock(),
    )
    service = UserService(users)  # type: ignore[arg-type]

    result = await service.update_user(
        2,
        actor=actor,  # type: ignore[arg-type]
        role="admin",
        is_active=False,
    )

    assert result is updated
    users.update_role_and_status.assert_awaited_once_with(
        target,
        role="admin",
        is_active=False,
    )
    users.increment_auth_version.assert_awaited_once_with(updated)


@pytest.mark.asyncio
async def test_update_user_rejects_missing() -> None:
    users = SimpleNamespace(get_by_id=AsyncMock(return_value=None))
    service = UserService(users)  # type: ignore[arg-type]

    with pytest.raises(NotFoundError):
        await service.update_user(
            99,
            actor=_user(id=1, role="admin"),  # type: ignore[arg-type]
            role="user",
            is_active=True,
        )


@pytest.mark.asyncio
async def test_update_user_rejects_self_deactivate() -> None:
    actor = _user(id=1, role="admin")
    users = SimpleNamespace(
        get_by_id=AsyncMock(return_value=actor),
        update_role_and_status=AsyncMock(),
    )
    service = UserService(users)  # type: ignore[arg-type]

    with pytest.raises(AppError) as exc_info:
        await service.update_user(
            1,
            actor=actor,  # type: ignore[arg-type]
            role="admin",
            is_active=False,
        )

    assert exc_info.value.code == "cannot_deactivate_self"
    users.update_role_and_status.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_user_rejects_last_admin_removal() -> None:
    target = _user(id=1, role="admin", is_active=True)
    actor = _user(id=2, role="admin")
    users = SimpleNamespace(
        get_by_id=AsyncMock(return_value=target),
        count_active_admins=AsyncMock(return_value=0),
        update_role_and_status=AsyncMock(),
    )
    service = UserService(users)  # type: ignore[arg-type]

    with pytest.raises(AppError) as exc_info:
        await service.update_user(
            1,
            actor=actor,  # type: ignore[arg-type]
            role="user",
            is_active=True,
        )

    assert exc_info.value.code == "last_admin"
    users.update_role_and_status.assert_not_awaited()
