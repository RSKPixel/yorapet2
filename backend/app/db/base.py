"""SQLAlchemy declarative bases and shared model metadata."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base for application-owned tables managed by Alembic."""


class LegacyBase(DeclarativeBase):
    """Base for read-only legacy models (for example tallydata_*).

    Models using this base must never be included in Alembic migrations
    and must never be written to by application code.
    """
