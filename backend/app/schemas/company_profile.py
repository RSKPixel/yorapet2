"""Company profile request and response schemas."""

from __future__ import annotations

import re
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_PATTERN = re.compile(r"^[0-9+\-\s().]{7,32}$")
_PIN_PATTERN = re.compile(r"^[0-9A-Za-z -]{3,20}$")
_GSTIN_PATTERN = re.compile(r"^[0-9A-Za-z]{0,32}$")


class CompanyProfileResponse(BaseModel):
    """Company profile returned to authenticated users."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    address: str
    area: str
    city: str
    pin: str
    email: str
    phone: str
    gstin: str
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class UpdateCompanyProfileRequest(BaseModel):
    """Payload for updating company profile details."""

    company_name: str = Field(min_length=1, max_length=160)
    address: str = Field(min_length=1, max_length=500)
    area: str = Field(min_length=1, max_length=120)
    city: str = Field(min_length=1, max_length=120)
    pin: str = Field(min_length=1, max_length=20)
    email: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=32)
    gstin: str = Field(min_length=1, max_length=32)

    @field_validator("company_name", "address", "area", "city")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("pin")
    @classmethod
    def normalize_pin(cls, value: str) -> str:
        normalized = value.strip()
        if not _PIN_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid PIN")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        normalized = value.strip()
        if not _PHONE_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid phone number")
        return normalized

    @field_validator("gstin")
    @classmethod
    def normalize_gstin(cls, value: str) -> str:
        normalized = re.sub(r"\s+", "", value).upper()
        if not _GSTIN_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid GSTIN")
        return normalized
