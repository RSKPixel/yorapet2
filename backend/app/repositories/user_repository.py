"""Database operations for application users."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """SQLAlchemy persistence for users."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_username(self, username: str) -> User | None:
        result = await self._session.execute(
            select(User).where(User.username == username.lower()),
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(User).where(User.email == email.lower()),
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def list_users(self) -> list[User]:
        result = await self._session.execute(
            select(User).order_by(User.username.asc()),
        )
        return list(result.scalars().all())

    async def count_active_admins(
        self,
        *,
        excluding_user_id: int | None = None,
    ) -> int:
        statement = select(func.count()).select_from(User).where(
            User.role == "admin",
            User.is_active.is_(True),
        )
        if excluding_user_id is not None:
            statement = statement.where(User.id != excluding_user_id)
        result = await self._session.execute(statement)
        return int(result.scalar_one())

    def add(self, user: User) -> None:
        self._session.add(user)

    async def create(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def update_role_and_status(
        self,
        user: User,
        *,
        role: str,
        is_active: bool,
    ) -> User:
        user.role = role
        user.is_active = is_active
        await self._session.flush()
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def increment_auth_version(self, user: User) -> None:
        user.auth_version += 1
        await self._session.flush()

    async def set_password_hash(self, user: User, password_hash: str) -> None:
        user.password_hash = password_hash
        await self._session.flush()

    async def update_profile(
        self,
        user: User,
        *,
        display_name: str,
        email: str | None,
        phone: str | None,
    ) -> User:
        user.display_name = display_name
        user.email = email
        user.phone = phone
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def record_login(self, user: User, occurred_at: datetime) -> None:
        user.last_login_at = occurred_at
        await self._session.flush()
