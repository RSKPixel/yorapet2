"""Add voucher and line credit_note fields for manual costing allocation.

Revision ID: 20260801_04
Revises: 20260801_03
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260801_04"
down_revision: str | None = "20260801_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DECIMAL = sa.Numeric(18, 2)


def upgrade() -> None:
    op.add_column(
        "yorapet_purchase_expense",
        sa.Column("credit_note", _DECIMAL, nullable=False, server_default="0"),
    )
    op.add_column(
        "yorapet_purchase",
        sa.Column("credit_note", _DECIMAL, nullable=True),
    )
    op.create_table(
        "yorapet_purchase_line_credit",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sync_key", sa.String(length=64), nullable=False),
        sa.Column("credit_note", _DECIMAL, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sync_key", name="uq_yorapet_purchase_line_credit_sync_key"),
    )
    op.create_index(
        "ix_yorapet_purchase_line_credit_sync_key",
        "yorapet_purchase_line_credit",
        ["sync_key"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_yorapet_purchase_line_credit_sync_key",
        table_name="yorapet_purchase_line_credit",
    )
    op.drop_table("yorapet_purchase_line_credit")
    op.drop_column("yorapet_purchase", "credit_note")
    op.drop_column("yorapet_purchase_expense", "credit_note")
