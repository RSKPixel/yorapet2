"""Create yorapet_opening_stock table.

Revision ID: 20260728_07
Revises: 20260728_06
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_07"
down_revision: str | None = "20260728_06"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create opening stock balances for stock summary / FIFO."""
    op.create_table(
        "yorapet_opening_stock",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("stock_item", sa.String(length=255), nullable=False),
        sa.Column("opening_date", sa.DateTime(), nullable=False),
        sa.Column("qty", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("opening_rate", sa.Numeric(precision=18, scale=2), nullable=True),
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
    )
    op.create_index(
        "ix_yorapet_opening_stock_stock_item",
        "yorapet_opening_stock",
        ["stock_item"],
        unique=False,
    )
    op.create_index(
        "ix_yorapet_opening_stock_opening_date",
        "yorapet_opening_stock",
        ["opening_date"],
        unique=False,
    )


def downgrade() -> None:
    """Drop opening stock table."""
    op.drop_index(
        "ix_yorapet_opening_stock_opening_date",
        table_name="yorapet_opening_stock",
    )
    op.drop_index(
        "ix_yorapet_opening_stock_stock_item",
        table_name="yorapet_opening_stock",
    )
    op.drop_table("yorapet_opening_stock")
