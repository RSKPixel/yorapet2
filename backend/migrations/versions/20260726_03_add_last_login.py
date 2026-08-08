"""Add last login timestamp to users.

Revision ID: 20260726_03
Revises: 20260726_02
Create Date: 2026-07-26
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260726_03"
down_revision: str | None = "20260726_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Track the most recent successful login in UTC."""
    op.add_column(
        "users",
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE users SET last_login_at = UTC_TIMESTAMP() "
            "WHERE last_login_at IS NULL"
        ),
    )


def downgrade() -> None:
    """Remove last login tracking."""
    op.drop_column("users", "last_login_at")
