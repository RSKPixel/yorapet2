"""Create yorapet_inventory_extra for app-owned stock item fields.

Revision ID: 20260729_01
Revises: 20260728_08
Create Date: 2026-07-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_01"
down_revision: str | None = "20260728_08"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "yorapet_inventory_extra",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("stock_item", sa.String(length=255), nullable=False),
        sa.Column("image_path", sa.String(length=512), nullable=True),
        sa.Column("weight", sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column("neck_size", sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column("qty_per_box", sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column("box_dimension", sa.String(length=255), nullable=True),
        sa.Column("reorder_level", sa.Numeric(precision=18, scale=2), nullable=True),
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
        sa.UniqueConstraint("stock_item", name="uq_yorapet_inventory_extra_stock_item"),
    )


def downgrade() -> None:
    op.drop_table("yorapet_inventory_extra")
