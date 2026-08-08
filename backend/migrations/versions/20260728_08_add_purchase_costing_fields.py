"""Add purchase costing fields to yorapet_purchase.

Revision ID: 20260728_08
Revises: 20260728_07
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_08"
down_revision: str | None = "20260728_07"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DECIMAL = sa.Numeric(18, 2)


def upgrade() -> None:
    op.add_column(
        "yorapet_purchase",
        sa.Column("expenses", _DECIMAL, nullable=True, server_default="0"),
    )
    op.add_column(
        "yorapet_purchase",
        sa.Column("credit_note", _DECIMAL, nullable=True, server_default="0"),
    )
    op.add_column(
        "yorapet_purchase",
        sa.Column("cost_value", _DECIMAL, nullable=True),
    )
    op.add_column(
        "yorapet_purchase",
        sa.Column("cost_price", _DECIMAL, nullable=True),
    )
    # Backfill from amount/qty with expenses and credit_note at zero.
    op.execute(
        sa.text(
            """
            UPDATE yorapet_purchase
            SET
                expenses = COALESCE(expenses, 0),
                credit_note = COALESCE(credit_note, 0),
                cost_value = ROUND(COALESCE(amount, 0), 2),
                cost_price = CASE
                    WHEN qty IS NULL OR qty = 0 THEN NULL
                    ELSE ROUND(COALESCE(amount, 0) / qty, 2)
                END
            """
        )
    )


def downgrade() -> None:
    op.drop_column("yorapet_purchase", "cost_price")
    op.drop_column("yorapet_purchase", "cost_value")
    op.drop_column("yorapet_purchase", "credit_note")
    op.drop_column("yorapet_purchase", "expenses")
