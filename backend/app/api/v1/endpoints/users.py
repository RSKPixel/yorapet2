"""User administration API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.dependencies.auth import CurrentAdminDep
from app.dependencies.database import DbSessionDep
from app.repositories.user_repository import UserRepository
from app.schemas.users import (
    CreateUserRequest,
    ManagedUserResponse,
    UpdateUserRequest,
    UserListResponse,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    _admin: CurrentAdminDep,
    session: DbSessionDep,
) -> UserListResponse:
    """List all application users (admin only)."""
    users = await UserService(UserRepository(session)).list_users()
    return UserListResponse(
        items=[ManagedUserResponse.model_validate(user) for user in users],
    )


@router.post(
    "",
    response_model=ManagedUserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    payload: CreateUserRequest,
    _admin: CurrentAdminDep,
    session: DbSessionDep,
) -> ManagedUserResponse:
    """Create a new application user (admin only)."""
    user = await UserService(UserRepository(session)).create_user(
        username=payload.username,
        display_name=payload.display_name,
        password=payload.password,
        role=payload.role,
        is_active=payload.is_active,
    )
    return ManagedUserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=ManagedUserResponse)
async def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    admin: CurrentAdminDep,
    session: DbSessionDep,
) -> ManagedUserResponse:
    """Update a user's role and status (admin only)."""
    user = await UserService(UserRepository(session)).update_user(
        user_id,
        actor=admin,
        role=payload.role,
        is_active=payload.is_active,
    )
    return ManagedUserResponse.model_validate(user)
