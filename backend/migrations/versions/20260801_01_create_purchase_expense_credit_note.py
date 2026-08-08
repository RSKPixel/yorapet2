"""Create purchase expense and credit note overlay tables.

Revision ID: 20260801_01
Revises: 20260731_02
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260801_01"
down_revision: str | None = "20260731_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DECIMAL = sa.Numeric(18, 2)


def upgrade() -> None:
    op.create_table(
        "yorapet_purchase_expense",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("voucher_no", sa.String(length=64), nullable=False),
        sa.Column("expenses", _DECIMAL, nullable=False, server_default="0"),
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
        sa.UniqueConstraint("voucher_no", name="uq_yorapet_purchase_expense_voucher_no"),
    )
    op.create_index(
        "ix_yorapet_purchase_expense_voucher_no",
        "yorapet_purchase_expense",
        ["voucher_no"],
        unique=False,
    )

    op.create_table(
        "yorapet_purchase_credit_note",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("voucher_no", sa.String(length=64), nullable=False),
        sa.Column("stock_item", sa.String(length=255), nullable=False),
        sa.Column("credit_note", _DECIMAL, nullable=False, server_default="0"),
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
            "voucher_no",
            "stock_item",
            name="uq_yorapet_purchase_credit_note_voucher_item",
        ),
    )
    op.create_index(
        "ix_yorapet_purchase_credit_note_voucher_no",
        "yorapet_purchase_credit_note",
        ["voucher_no"],
        unique=False,
    )
    op.create_index(
        "ix_yorapet_purchase_credit_note_stock_item",
        "yorapet_purchase_credit_note",
        ["stock_item"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_yorapet_purchase_credit_note_stock_item",
        table_name="yorapet_purchase_credit_note",
    )
    op.drop_index(
        "ix_yorapet_purchase_credit_note_voucher_no",
        table_name="yorapet_purchase_credit_note",
    )
    op.drop_table("yorapet_purchase_credit_note")
    op.drop_index(
        "ix_yorapet_purchase_expense_voucher_no",
        table_name="yorapet_purchase_expense",
    )
    op.drop_table("yorapet_purchase_expense")
