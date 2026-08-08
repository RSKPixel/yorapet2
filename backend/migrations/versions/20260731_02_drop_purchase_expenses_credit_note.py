"""Drop expenses and credit_note from yorapet_purchase.

Revision ID: 20260731_02
Revises: 20260731_01
Create Date: 2026-07-31
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_02"
down_revision: str | None = "20260731_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DECIMAL = sa.Numeric(18, 2)


def upgrade() -> None:
    op.drop_column("yorapet_purchase", "credit_note")
    op.drop_column("yorapet_purchase", "expenses")
    # Recalculate cost_* from amount/qty only.
    op.execute(
        sa.text(
            """
            UPDATE yorapet_purchase
            SET
                cost_value = ROUND(COALESCE(amount, 0), 2),
                cost_price = CASE
                    WHEN qty IS NULL OR qty = 0 THEN NULL
                    ELSE ROUND(COALESCE(amount, 0) / qty, 2)
                END
            """
        ),
    )


def downgrade() -> None:
    op.add_column(
        "yorapet_purchase",
        sa.Column("expenses", _DECIMAL, nullable=True, server_default="0"),
    )
    op.add_column(
        "yorapet_purchase",
        sa.Column("credit_note", _DECIMAL, nullable=True, server_default="0"),
    )
