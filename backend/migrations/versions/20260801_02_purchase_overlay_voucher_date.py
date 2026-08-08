"""Add voucher_date to purchase expense and credit note overlays.

Revision ID: 20260801_02
Revises: 20260801_01
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260801_02"
down_revision: str | None = "20260801_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "yorapet_purchase_expense",
        sa.Column("voucher_date", sa.DateTime(), nullable=True),
    )
    op.drop_constraint(
        "uq_yorapet_purchase_expense_voucher_no",
        "yorapet_purchase_expense",
        type_="unique",
    )
    op.create_index(
        "ix_yorapet_purchase_expense_voucher_date",
        "yorapet_purchase_expense",
        ["voucher_date"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_yorapet_purchase_expense_voucher",
        "yorapet_purchase_expense",
        ["voucher_no", "voucher_date"],
    )

    op.add_column(
        "yorapet_purchase_credit_note",
        sa.Column("voucher_date", sa.DateTime(), nullable=True),
    )
    op.drop_constraint(
        "uq_yorapet_purchase_credit_note_voucher_item",
        "yorapet_purchase_credit_note",
        type_="unique",
    )
    op.create_index(
        "ix_yorapet_purchase_credit_note_voucher_date",
        "yorapet_purchase_credit_note",
        ["voucher_date"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_yorapet_purchase_credit_note_voucher_item",
        "yorapet_purchase_credit_note",
        ["voucher_no", "voucher_date", "stock_item"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_yorapet_purchase_credit_note_voucher_item",
        "yorapet_purchase_credit_note",
        type_="unique",
    )
    op.drop_index(
        "ix_yorapet_purchase_credit_note_voucher_date",
        table_name="yorapet_purchase_credit_note",
    )
    op.create_unique_constraint(
        "uq_yorapet_purchase_credit_note_voucher_item",
        "yorapet_purchase_credit_note",
        ["voucher_no", "stock_item"],
    )
    op.drop_column("yorapet_purchase_credit_note", "voucher_date")

    op.drop_constraint(
        "uq_yorapet_purchase_expense_voucher",
        "yorapet_purchase_expense",
        type_="unique",
    )
    op.drop_index(
        "ix_yorapet_purchase_expense_voucher_date",
        table_name="yorapet_purchase_expense",
    )
    op.create_unique_constraint(
        "uq_yorapet_purchase_expense_voucher_no",
        "yorapet_purchase_expense",
        ["voucher_no"],
    )
    op.drop_column("yorapet_purchase_expense", "voucher_date")
