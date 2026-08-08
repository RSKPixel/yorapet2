"""Authentication API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.core.exceptions import AuthenticationError
from app.core.security import create_token
from app.dependencies.auth import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    CurrentUserDep,
    RefreshUserDep,
)
from app.dependencies.database import DbSessionDep, SettingsDep
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])


def _set_auth_cookies(
    response: Response,
    *,
    user_id: int,
    auth_version: int,
    settings: SettingsDep,
) -> None:
    access_token = create_token(
        user_id=user_id,
        auth_version=auth_version,
        token_type="access",
        settings=settings,
    )
    refresh_token = create_token(
        user_id=user_id,
        auth_version=auth_version,
        token_type="refresh",
        settings=settings,
    )
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        path=settings.api_v1_prefix,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path=f"{settings.api_v1_prefix}/auth",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
    )


def _clear_auth_cookies(response: Response, settings: SettingsDep) -> None:
    response.delete_cookie(
        ACCESS_COOKIE_NAME,
        path=settings.api_v1_prefix,
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=f"{settings.api_v1_prefix}/auth",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite="lax",
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    session: DbSessionDep,
    settings: SettingsDep,
) -> AuthResponse:
    """Authenticate credentials and issue HTTP-only JWT cookies."""
    user = await AuthService(UserRepository(session)).authenticate(
        payload.username,
        payload.password,
    )
    if user is None:
        raise AuthenticationError("Incorrect username or password")

    _set_auth_cookies(
        response,
        user_id=user.id,
        auth_version=user.auth_version,
        settings=settings,
    )
    return AuthResponse(user=UserResponse.model_validate(user))


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    user: RefreshUserDep,
    settings: SettingsDep,
) -> AuthResponse:
    """Rotate the access and refresh cookies."""
    _set_auth_cookies(
        response,
        user_id=user.id,
        auth_version=user.auth_version,
        settings=settings,
    )
    return AuthResponse(user=UserResponse.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    user: RefreshUserDep,
    session: DbSessionDep,
    settings: SettingsDep,
) -> Response:
    """Invalidate the current user's JWT session and clear cookies."""
    await UserRepository(session).increment_auth_version(user)
    _clear_auth_cookies(response, settings)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=AuthResponse)
async def get_me(user: CurrentUserDep) -> AuthResponse:
    """Return the authenticated user."""
    return AuthResponse(user=UserResponse.model_validate(user))


@router.patch("/me", response_model=AuthResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    user: CurrentUserDep,
    session: DbSessionDep,
) -> AuthResponse:
    """Update the current user's profile details."""
    updated_user = await AuthService(UserRepository(session)).update_profile(
        user,
        display_name=payload.display_name,
        email=payload.email,
        phone=payload.phone,
    )
    return AuthResponse(user=UserResponse.model_validate(updated_user))


@router.post("/change-password", response_model=AuthResponse)
async def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    user: CurrentUserDep,
    session: DbSessionDep,
    settings: SettingsDep,
) -> AuthResponse:
    """Change the current user's password and rotate session cookies."""
    updated_user = await AuthService(UserRepository(session)).change_password(
        user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    _set_auth_cookies(
        response,
        user_id=updated_user.id,
        auth_version=updated_user.auth_version,
        settings=settings,
    )
    return AuthResponse(user=UserResponse.model_validate(updated_user))
