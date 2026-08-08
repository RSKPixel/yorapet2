"""Authentication dependency providers."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import TokenType, decode_token
from app.dependencies.database import DbSessionDep, SettingsDep
from app.models.user import User
from app.repositories.user_repository import UserRepository

ACCESS_COOKIE_NAME = "yorapet_access"
REFRESH_COOKIE_NAME = "yorapet_refresh"


async def resolve_user_from_cookie(
    request: Request,
    session: DbSessionDep,
    settings: SettingsDep,
    *,
    cookie_name: str,
    token_type: TokenType,
) -> User:
    """Resolve and validate a user from an HTTP-only JWT cookie."""
    token = request.cookies.get(cookie_name)
    if not token:
        raise AuthenticationError()

    user_id, auth_version = decode_token(
        token,
        expected_type=token_type,
        settings=settings,
    )
    user = await UserRepository(session).get_by_id(user_id)
    if (
        user is None
        or not user.is_active
        or user.auth_version != auth_version
    ):
        raise AuthenticationError("Invalid authentication session")
    return user


async def get_current_user(
    request: Request,
    session: DbSessionDep,
    settings: SettingsDep,
) -> User:
    """Require a valid access-token cookie."""
    return await resolve_user_from_cookie(
        request,
        session,
        settings,
        cookie_name=ACCESS_COOKIE_NAME,
        token_type="access",
    )


async def get_current_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require the authenticated user to have the admin role."""
    if user.role != "admin":
        raise AuthorizationError("Administrator access required")
    return user


async def get_refresh_user(
    request: Request,
    session: DbSessionDep,
    settings: SettingsDep,
) -> User:
    """Require a valid refresh-token cookie."""
    return await resolve_user_from_cookie(
        request,
        session,
        settings,
        cookie_name=REFRESH_COOKIE_NAME,
        token_type="refresh",
    )


CurrentUserDep = Annotated[User, Depends(get_current_user)]
CurrentAdminDep = Annotated[User, Depends(get_current_admin)]
RefreshUserDep = Annotated[User, Depends(get_refresh_user)]
