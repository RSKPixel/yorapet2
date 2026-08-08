"""Use DECIMAL for synced purchase and sales numeric fields.

Revision ID: 20260728_06
Revises: 20260728_05
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_06"
down_revision: str | None = "20260728_05"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DECIMAL = sa.Numeric(18, 2)
_FLOAT = sa.Float()


def _to_decimal(table: str, column: str) -> None:
    op.alter_column(
        table,
        column,
        existing_type=_FLOAT,
        type_=_DECIMAL,
        existing_nullable=True,
    )


def _to_float(table: str, column: str) -> None:
    op.alter_column(
        table,
        column,
        existing_type=_DECIMAL,
        type_=_FLOAT,
        existing_nullable=True,
    )


def upgrade() -> None:
    """Store synced numeric values with fixed decimal precision."""
    purchase_columns = (
        "item_count",
        "itemno",
        "packing",
        "qty",
        "weight",
        "rate",
        "amount",
    )
    sales_columns = (
        "item_count",
        "item_no",
        "packing",
        "qty",
        "rate",
        "amount",
        "discount",
    )

    for column in purchase_columns:
        _to_decimal("yorapet_purchase", column)

    for column in sales_columns:
        _to_decimal("yorapet_sales", column)


def downgrade() -> None:
    """Restore FLOAT columns for synced numeric values."""
    purchase_columns = (
        "item_count",
        "itemno",
        "packing",
        "qty",
        "weight",
        "rate",
        "amount",
    )
    sales_columns = (
        "item_count",
        "item_no",
        "packing",
        "qty",
        "rate",
        "amount",
        "discount",
    )

    for column in purchase_columns:
        _to_float("yorapet_purchase", column)

    for column in sales_columns:
        _to_float("yorapet_sales", column)
