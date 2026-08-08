"""Add box, qty_per_box, and value_addition to yorapet_purchase.

Revision ID: 20260801_03
Revises: 20260801_02
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260801_03"
down_revision: str | None = "20260801_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DECIMAL = sa.Numeric(18, 2)


def upgrade() -> None:
    op.add_column(
        "yorapet_purchase",
        sa.Column("box", _DECIMAL, nullable=True),
    )
    op.add_column(
        "yorapet_purchase",
        sa.Column("qty_per_box", _DECIMAL, nullable=True),
    )
    op.add_column(
        "yorapet_purchase",
        sa.Column("value_addition", _DECIMAL, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("yorapet_purchase", "value_addition")
    op.drop_column("yorapet_purchase", "qty_per_box")
    op.drop_column("yorapet_purchase", "box")
