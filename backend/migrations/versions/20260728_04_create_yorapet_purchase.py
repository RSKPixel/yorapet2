"""Create yorapet_purchase table.

Revision ID: 20260728_04
Revises: 20260728_03
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_04"
down_revision: str | None = "20260728_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create purchase lines synced from tallydata_purchases."""
    op.create_table(
        "yorapet_purchase",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tally_source_id", sa.BigInteger(), nullable=False),
        sa.Column("voucher_no", sa.String(length=64), nullable=True),
        sa.Column("voucher_date", sa.DateTime(), nullable=True),
        sa.Column("ledger_name", sa.String(length=255), nullable=True),
        sa.Column("broker", sa.String(length=255), nullable=True),
        sa.Column("item_count", sa.Float(), nullable=True),
        sa.Column("itemno", sa.Float(), nullable=True),
        sa.Column("stock_item", sa.String(length=255), nullable=True),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("packing", sa.Float(), nullable=True),
        sa.Column("qty", sa.Float(), nullable=True),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("rate", sa.Float(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tally_source_id", name="uq_yorapet_purchase_tally_source_id"),
    )
    op.create_index(
        "ix_yorapet_purchase_tally_source_id",
        "yorapet_purchase",
        ["tally_source_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop purchase sync table."""
    op.drop_index("ix_yorapet_purchase_tally_source_id", table_name="yorapet_purchase")
    op.drop_table("yorapet_purchase")
