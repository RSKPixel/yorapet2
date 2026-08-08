"""Authentication business logic."""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.exceptions import AppError, ConflictError
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository

_DUMMY_PASSWORD_HASH = hash_password("not-a-real-user-password")


class AuthService:
    """Authenticate users and provision the configured administrator."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def authenticate(self, username: str, password: str) -> User | None:
        user = await self._users.get_by_username(username)
        stored_hash = user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
        password_valid = verify_password(password, stored_hash)
        if user is None or not password_valid or not user.is_active:
            return None
        await self._users.record_login(
            user,
            datetime.now(UTC).replace(tzinfo=None),
        )
        return user

    async def change_password(
        self,
        user: User,
        *,
        current_password: str,
        new_password: str,
    ) -> User:
        """Update the user's password and invalidate other sessions."""
        if not verify_password(current_password, user.password_hash):
            raise AppError(
                "Current password is incorrect",
                code="invalid_current_password",
                status_code=400,
            )
        if verify_password(new_password, user.password_hash):
            raise AppError(
                "New password must be different from the current password",
                code="password_unchanged",
                status_code=400,
            )

        await self._users.set_password_hash(user, hash_password(new_password))
        await self._users.increment_auth_version(user)
        return user

    async def update_profile(
        self,
        user: User,
        *,
        display_name: str,
        email: str | None,
        phone: str | None,
    ) -> User:
        """Update the authenticated user's profile details."""
        if email is not None:
            existing = await self._users.get_by_email(email)
            if existing is not None and existing.id != user.id:
                raise ConflictError(
                    "A user with this email already exists",
                    details={"field": "email"},
                )

        return await self._users.update_profile(
            user,
            display_name=display_name,
            email=email,
            phone=phone,
        )

    async def seed_admin(
        self,
        *,
        username: str,
        password: str,
        display_name: str,
    ) -> bool:
        """Create the configured administrator when it does not exist."""
        normalized_username = username.strip().lower()
        if await self._users.get_by_username(normalized_username) is not None:
            return False

        self._users.add(
            User(
                username=normalized_username,
                display_name=display_name.strip() or "Administrator",
                password_hash=hash_password(password),
                role="admin",
                is_active=True,
            ),
        )
        return True
