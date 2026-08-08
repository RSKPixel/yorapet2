"""Tests for password hashing and JWT validation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from app.core.config import Settings
from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_token,
    decode_token,
    hash_password,
    verify_password,
)


@pytest.fixture()
def settings() -> Settings:
    return Settings(jwt_secret_key="test-secret-that-is-long-enough-for-unit-tests")


def test_password_hash_round_trip() -> None:
    hashed = hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_access_token_round_trip(settings: Settings) -> None:
    token = create_token(
        user_id=42,
        auth_version=3,
        token_type="access",
        settings=settings,
    )
    assert decode_token(
        token,
        expected_type="access",
        settings=settings,
    ) == (42, 3)


def test_access_token_uses_24_hour_expiry(settings: Settings) -> None:
    token = create_token(
        user_id=42,
        auth_version=3,
        token_type="access",
        settings=settings,
    )
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
    issued_at = datetime.fromtimestamp(payload["iat"], tz=UTC)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=UTC)

    assert expires_at - issued_at == timedelta(
        minutes=settings.access_token_expire_minutes
    )


def test_refresh_token_outlives_access_token(settings: Settings) -> None:
    access_token = create_token(
        user_id=42,
        auth_version=3,
        token_type="access",
        settings=settings,
    )
    refresh_token = create_token(
        user_id=42,
        auth_version=3,
        token_type="refresh",
        settings=settings,
    )
    access_payload = jwt.decode(
        access_token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
    refresh_payload = jwt.decode(
        refresh_token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )

    assert refresh_payload["type"] == "refresh"
    assert access_payload["type"] == "access"
    assert refresh_payload["exp"] > access_payload["exp"]


def test_rejects_wrong_token_type(settings: Settings) -> None:
    token = create_token(
        user_id=42,
        auth_version=1,
        token_type="refresh",
        settings=settings,
    )
    with pytest.raises(AuthenticationError):
        decode_token(token, expected_type="access", settings=settings)


def test_rejects_tampered_token(settings: Settings) -> None:
    token = create_token(
        user_id=42,
        auth_version=1,
        token_type="access",
        settings=settings,
    )
    with pytest.raises(AuthenticationError):
        decode_token(f"{token}tampered", expected_type="access", settings=settings)
