"""User administration request and response schemas."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
)

UserRole = Literal["admin", "user"]


class CreateUserRequest(BaseModel):
    """Payload for creating an application user."""

    username: str = Field(min_length=3, max_length=100)
    display_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=1024)
    role: UserRole = "user"
    is_active: bool = True

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return value.strip()


class UpdateUserRequest(BaseModel):
    """Payload for updating a user's role and status."""

    role: UserRole
    is_active: bool


class ManagedUserResponse(BaseModel):
    """Safe user representation for administration screens."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime

    @field_serializer("last_login_at", "created_at")
    def serialize_datetimes(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class UserListResponse(BaseModel):
    """Collection of managed users."""

    items: list[ManagedUserResponse]
