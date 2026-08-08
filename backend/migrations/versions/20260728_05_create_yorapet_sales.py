"""Create yorapet_sales table.

Revision ID: 20260728_05
Revises: 20260728_04
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_05"
down_revision: str | None = "20260728_04"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create sales lines synced from tallydata_sales."""
    op.create_table(
        "yorapet_sales",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tally_source_id", sa.BigInteger(), nullable=False),
        sa.Column("voucher_no", sa.String(length=64), nullable=True),
        sa.Column("voucher_date", sa.DateTime(), nullable=True),
        sa.Column("ledger_name", sa.String(length=255), nullable=True),
        sa.Column("broker", sa.String(length=255), nullable=True),
        sa.Column("item_count", sa.Float(), nullable=True),
        sa.Column("item_no", sa.Float(), nullable=True),
        sa.Column("stock_item", sa.String(length=255), nullable=True),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("packing", sa.Float(), nullable=True),
        sa.Column("qty", sa.Float(), nullable=True),
        sa.Column("rate", sa.Float(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("discount", sa.Float(), nullable=True),
        sa.Column("cartage", sa.String(length=64), nullable=True),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tally_source_id", name="uq_yorapet_sales_tally_source_id"),
    )
    op.create_index(
        "ix_yorapet_sales_tally_source_id",
        "yorapet_sales",
        ["tally_source_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop sales sync table."""
    op.drop_index("ix_yorapet_sales_tally_source_id", table_name="yorapet_sales")
    op.drop_table("yorapet_sales")
