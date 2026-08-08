"""Replace user email identity with username.

Revision ID: 20260726_02
Revises: 20260726_01
Create Date: 2026-07-26
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260726_02"
down_revision: str | None = "20260726_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Convert existing email identities to lowercase usernames."""
    op.drop_index("ix_users_email", table_name="users")
    op.drop_constraint("uq_users_email", "users", type_="unique")
    op.execute(
        sa.text(
            "UPDATE users "
            "SET email = LOWER(SUBSTRING_INDEX(email, '@', 1))"
        ),
    )
    op.alter_column(
        "users",
        "email",
        new_column_name="username",
        existing_type=sa.String(length=255),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
    op.create_unique_constraint("uq_users_username", "users", ["username"])
    op.create_index("ix_users_username", "users", ["username"], unique=False)


def downgrade() -> None:
    """Restore email-style identities."""
    op.drop_index("ix_users_username", table_name="users")
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.alter_column(
        "users",
        "username",
        new_column_name="email",
        existing_type=sa.String(length=100),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.execute(
        sa.text(
            "UPDATE users "
            "SET email = CONCAT(email, '@yorapet.local')"
        ),
    )
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index("ix_users_email", "users", ["email"], unique=False)
