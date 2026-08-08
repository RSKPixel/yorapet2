"""Add optional email and phone contact fields to users.

Revision ID: 20260728_01
Revises: 20260726_03
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_01"
down_revision: str | None = "20260726_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Allow users to store contact email and phone."""
    op.add_column(
        "users",
        sa.Column("email", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("phone", sa.String(length=32), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)


def downgrade() -> None:
    """Remove contact email and phone fields."""
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "phone")
    op.drop_column("users", "email")
