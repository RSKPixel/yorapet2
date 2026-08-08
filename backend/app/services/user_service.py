"""User administration business logic."""

from __future__ import annotations

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository


class UserService:
    """Manage application users."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def list_users(self) -> list[User]:
        return await self._users.list_users()

    async def create_user(
        self,
        *,
        username: str,
        display_name: str,
        password: str,
        role: str,
        is_active: bool,
    ) -> User:
        if await self._users.get_by_username(username) is not None:
            raise ConflictError(
                "A user with this username already exists",
                details={"field": "username"},
            )

        return await self._users.create(
            User(
                username=username,
                display_name=display_name,
                password_hash=hash_password(password),
                role=role,
                is_active=is_active,
            ),
        )

    async def update_user(
        self,
        user_id: int,
        *,
        actor: User,
        role: str,
        is_active: bool,
    ) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")

        if actor.id == user.id and not is_active:
            raise AppError(
                "You cannot deactivate your own account",
                code="cannot_deactivate_self",
                status_code=400,
            )

        was_active_admin = user.role == "admin" and user.is_active
        will_be_active_admin = role == "admin" and is_active
        if was_active_admin and not will_be_active_admin:
            other_admins = await self._users.count_active_admins(
                excluding_user_id=user.id,
            )
            if other_admins < 1:
                raise AppError(
                    "Cannot remove the last active administrator",
                    code="last_admin",
                    status_code=400,
                )

        previously_active = user.is_active
        updated = await self._users.update_role_and_status(
            user,
            role=role,
            is_active=is_active,
        )
        if previously_active and not is_active:
            await self._users.increment_auth_version(updated)
        return updated
