"""Store inventory images in yorapet_inventory_extra as BLOB.

Revision ID: 20260729_02
Revises: 20260729_01
Create Date: 2026-07-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mysql import LONGBLOB

revision: str = "20260729_02"
down_revision: str | None = "20260729_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "yorapet_inventory_extra",
        sa.Column("image_data", LONGBLOB(), nullable=True),
    )
    op.add_column(
        "yorapet_inventory_extra",
        sa.Column("image_content_type", sa.String(length=64), nullable=True),
    )
    op.drop_column("yorapet_inventory_extra", "image_path")


def downgrade() -> None:
    op.add_column(
        "yorapet_inventory_extra",
        sa.Column("image_path", sa.String(length=512), nullable=True),
    )
    op.drop_column("yorapet_inventory_extra", "image_content_type")
    op.drop_column("yorapet_inventory_extra", "image_data")
