"""Authentication request and response schemas."""

from __future__ import annotations

import re
from datetime import UTC, datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
)

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_PATTERN = re.compile(r"^[0-9+\-\s().]{7,32}$")


class LoginRequest(BaseModel):
    """Credentials accepted by the login endpoint."""

    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=1, max_length=1024)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class ChangePasswordRequest(BaseModel):
    """Payload for updating the authenticated user's password."""

    current_password: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=8, max_length=1024)


class UpdateProfileRequest(BaseModel):
    """Payload for updating the authenticated user's profile."""

    display_name: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not normalized:
            return None
        if not _EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        if not _PHONE_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid phone number")
        return normalized


class UserResponse(BaseModel):
    """Safe authenticated user representation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    email: str | None = None
    phone: str | None = None
    role: str
    last_login_at: datetime | None

    @field_serializer("last_login_at")
    def serialize_last_login_at(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class AuthResponse(BaseModel):
    """Successful authentication response."""

    user: UserResponse
