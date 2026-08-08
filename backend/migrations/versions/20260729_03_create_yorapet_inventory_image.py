"""Move inventory images to yorapet_inventory_image (max 4 per item).

Revision ID: 20260729_03
Revises: 20260729_02
Create Date: 2026-07-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mysql import LONGBLOB

revision: str = "20260729_03"
down_revision: str | None = "20260729_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "yorapet_inventory_image",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("stock_item", sa.String(length=255), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("image_content_type", sa.String(length=64), nullable=False),
        sa.Column("image_data", LONGBLOB(), nullable=False),
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
        sa.UniqueConstraint(
            "stock_item",
            "position",
            name="uq_yorapet_inventory_image_item_position",
        ),
    )
    op.create_index(
        "ix_yorapet_inventory_image_stock_item",
        "yorapet_inventory_image",
        ["stock_item"],
        unique=False,
    )

    # Preserve any existing single image as position 1.
    op.execute(
        sa.text(
            """
            INSERT INTO yorapet_inventory_image
                (stock_item, position, image_content_type, image_data)
            SELECT
                stock_item,
                1,
                image_content_type,
                image_data
            FROM yorapet_inventory_extra
            WHERE image_data IS NOT NULL
              AND image_content_type IS NOT NULL
            """
        ),
    )

    op.drop_column("yorapet_inventory_extra", "image_data")
    op.drop_column("yorapet_inventory_extra", "image_content_type")


def downgrade() -> None:
    op.add_column(
        "yorapet_inventory_extra",
        sa.Column("image_content_type", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "yorapet_inventory_extra",
        sa.Column("image_data", LONGBLOB(), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE yorapet_inventory_extra e
            INNER JOIN yorapet_inventory_image i
                ON i.stock_item = e.stock_item AND i.position = 1
            SET
                e.image_data = i.image_data,
                e.image_content_type = i.image_content_type
            """
        ),
    )
    op.drop_index(
        "ix_yorapet_inventory_image_stock_item",
        table_name="yorapet_inventory_image",
    )
    op.drop_table("yorapet_inventory_image")
