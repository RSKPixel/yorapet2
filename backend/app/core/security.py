"""Password hashing and JWT helpers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from pwdlib import PasswordHash

from app.core.config import Settings
from app.core.exceptions import AuthenticationError

password_hash = PasswordHash.recommended()

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Safely verify a password hash."""
    return password_hash.verify(password, hashed_password)


def create_token(
    *,
    user_id: int,
    auth_version: int,
    token_type: TokenType,
    settings: Settings,
) -> str:
    """Create a signed access or refresh JWT."""
    now = datetime.now(UTC)
    expires_delta = (
        timedelta(minutes=settings.access_token_expire_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_expire_days)
    )
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": token_type,
        "ver": auth_version,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(
    token: str,
    *,
    expected_type: TokenType,
    settings: Settings,
) -> tuple[int, int]:
    """Validate a JWT and return its user ID and auth version."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "type", "ver", "iat", "exp"]},
        )
        if payload.get("type") != expected_type:
            raise AuthenticationError("Invalid authentication token")
        return int(payload["sub"]), int(payload["ver"])
    except AuthenticationError:
        raise
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise AuthenticationError("Invalid or expired authentication token") from exc
