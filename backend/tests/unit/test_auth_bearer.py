"""Unit tests for dual-mode (cookie / Bearer) authentication helpers."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.config import Settings
from app.core.exceptions import AuthenticationError
from app.core.security import create_token
from app.dependencies.auth import (
    extract_bearer_token,
    resolve_user_from_token,
    uses_bearer_auth,
)
from starlette.requests import Request


def _settings() -> Settings:
    return Settings(jwt_secret_key="test-secret-that-is-long-enough-for-unit-tests")


def _request(
    *,
    authorization: str | None = None,
    cookie: str | None = None,
) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if authorization is not None:
        headers.append((b"authorization", authorization.encode("latin-1")))
    if cookie is not None:
        headers.append((b"cookie", cookie.encode("latin-1")))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/auth/me",
        "headers": headers,
    }
    return Request(scope)


def test_extract_bearer_token_reads_authorization_header() -> None:
    request = _request(authorization="Bearer abc.def.ghi")
    assert extract_bearer_token(request) == "abc.def.ghi"
    assert uses_bearer_auth(request) is True


def test_extract_bearer_token_rejects_non_bearer() -> None:
    request = _request(authorization="Basic abc")
    assert extract_bearer_token(request) is None
    assert uses_bearer_auth(request) is False


@pytest.mark.asyncio
async def test_resolve_user_from_bearer_access_token() -> None:
    settings = _settings()
    token = create_token(
        user_id=7,
        auth_version=3,
        token_type="access",
        settings=settings,
    )
    user = SimpleNamespace(id=7, is_active=True, auth_version=3)
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=user)

    with patch(
        "app.dependencies.auth.UserRepository",
        return_value=repo,
    ):
        resolved = await resolve_user_from_token(
            _request(authorization=f"Bearer {token}"),
            MagicMock(),
            settings,
            cookie_name="yorapet_access",
            token_type="access",
        )
    assert resolved is user
    repo.get_by_id.assert_awaited_once_with(7)


@pytest.mark.asyncio
async def test_resolve_user_from_cookie_when_no_bearer() -> None:
    settings = _settings()
    token = create_token(
        user_id=9,
        auth_version=1,
        token_type="access",
        settings=settings,
    )
    user = SimpleNamespace(id=9, is_active=True, auth_version=1)
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=user)

    with patch(
        "app.dependencies.auth.UserRepository",
        return_value=repo,
    ):
        resolved = await resolve_user_from_token(
            _request(cookie=f"yorapet_access={token}"),
            MagicMock(),
            settings,
            cookie_name="yorapet_access",
            token_type="access",
        )
    assert resolved is user


@pytest.mark.asyncio
async def test_resolve_user_rejects_wrong_token_type() -> None:
    settings = _settings()
    refresh = create_token(
        user_id=1,
        auth_version=1,
        token_type="refresh",
        settings=settings,
    )
    with pytest.raises(AuthenticationError):
        await resolve_user_from_token(
            _request(authorization=f"Bearer {refresh}"),
            MagicMock(),
            settings,
            cookie_name="yorapet_access",
            token_type="access",
        )


@pytest.mark.asyncio
async def test_resolve_user_rejects_missing_credentials() -> None:
    settings = _settings()
    with pytest.raises(AuthenticationError):
        await resolve_user_from_token(
            _request(),
            MagicMock(),
            settings,
            cookie_name="yorapet_access",
            token_type="access",
        )
