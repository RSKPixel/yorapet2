"""Rename application tables to yorapet_* prefix.

Revision ID: 20260728_03
Revises: 20260728_02
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_03"
down_revision: str | None = "20260728_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _rename_index(table_name: str, old_name: str, new_name: str) -> None:
    op.execute(
        sa.text(
            f"ALTER TABLE {table_name} RENAME INDEX {old_name} TO {new_name}",
        ),
    )


def upgrade() -> None:
    """Rename application-owned tables and related indexes."""
    op.rename_table("users", "yorapet_users")
    op.rename_table("company_profiles", "yorapet_company_profiles")

    _rename_index("yorapet_users", "ix_users_username", "ix_yorapet_users_username")
    _rename_index("yorapet_users", "ix_users_email", "ix_yorapet_users_email")
    _rename_index("yorapet_users", "uq_users_username", "uq_yorapet_users_username")


def downgrade() -> None:
    """Restore original table and index names."""
    _rename_index("yorapet_users", "uq_yorapet_users_username", "uq_users_username")
    _rename_index("yorapet_users", "ix_yorapet_users_email", "ix_users_email")
    _rename_index("yorapet_users", "ix_yorapet_users_username", "ix_users_username")

    op.rename_table("yorapet_company_profiles", "company_profiles")
    op.rename_table("yorapet_users", "users")
