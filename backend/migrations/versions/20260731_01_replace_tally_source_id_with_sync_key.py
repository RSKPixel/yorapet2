"""Replace tally_source_id with content identity sync_key.

Revision ID: 20260731_01
Revises: 20260729_03
Create Date: 2026-07-31
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260731_01"
down_revision: str | None = "20260729_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _part(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, Decimal):
        return format(value.quantize(Decimal("0.01")), "f")
    if isinstance(value, float):
        return f"{round(value, 2):.2f}"
    if isinstance(value, str):
        return value.strip().lower()
    return str(value).strip().lower()


def _compute_sync_key(*parts: object | None) -> str:
    payload = "\0".join(_part(part) for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {col["name"] for col in inspect(bind).get_columns(table)}


def _backfill_purchases() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, voucher_no, voucher_date, ledger_name, broker, itemno,
                   stock_item, brand, packing, qty, weight, rate, amount
            FROM yorapet_purchase
            """
        ),
    ).mappings()
    update = sa.text(
        "UPDATE yorapet_purchase SET sync_key = :sync_key WHERE id = :id",
    )
    used: set[str] = set()
    for row in rows:
        sync_key = _compute_sync_key(
            "purchase",
            row["voucher_no"],
            row["voucher_date"],
            row["ledger_name"],
            row["broker"],
            row["itemno"],
            row["stock_item"],
            row["brand"],
            row["packing"],
            row["qty"],
            row["weight"],
            row["rate"],
            row["amount"],
        )
        if sync_key in used:
            sync_key = _compute_sync_key(sync_key, f"id:{row['id']}")
        used.add(sync_key)
        conn.execute(update, {"sync_key": sync_key, "id": row["id"]})


def _backfill_sales() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, voucher_no, voucher_date, ledger_name, broker, item_no,
                   stock_item, brand, packing, qty, rate, amount, discount, cartage
            FROM yorapet_sales
            """
        ),
    ).mappings()
    update = sa.text(
        "UPDATE yorapet_sales SET sync_key = :sync_key WHERE id = :id",
    )
    used: set[str] = set()
    for row in rows:
        sync_key = _compute_sync_key(
            "sale",
            row["voucher_no"],
            row["voucher_date"],
            row["ledger_name"],
            row["broker"],
            row["item_no"],
            row["stock_item"],
            row["brand"],
            row["packing"],
            row["qty"],
            row["rate"],
            row["amount"],
            row["discount"],
            row["cartage"],
        )
        if sync_key in used:
            sync_key = _compute_sync_key(sync_key, f"id:{row['id']}")
        used.add(sync_key)
        conn.execute(update, {"sync_key": sync_key, "id": row["id"]})


def upgrade() -> None:
    for table in ("yorapet_purchase", "yorapet_sales"):
        if not _has_column(table, "sync_key"):
            op.add_column(
                table,
                sa.Column("sync_key", sa.String(length=64), nullable=True),
            )

    _backfill_purchases()
    _backfill_sales()

    for table, old_uq, old_ix in (
        (
            "yorapet_purchase",
            "uq_yorapet_purchase_tally_source_id",
            "ix_yorapet_purchase_tally_source_id",
        ),
        (
            "yorapet_sales",
            "uq_yorapet_sales_tally_source_id",
            "ix_yorapet_sales_tally_source_id",
        ),
    ):
        op.alter_column(
            table,
            "sync_key",
            existing_type=sa.String(length=64),
            nullable=False,
        )
        op.create_unique_constraint(
            f"uq_{table}_sync_key",
            table,
            ["sync_key"],
        )
        op.create_index(
            f"ix_{table}_sync_key",
            table,
            ["sync_key"],
            unique=False,
        )
        op.drop_index(old_ix, table_name=table)
        op.drop_constraint(old_uq, table_name=table, type_="unique")
        op.drop_column(table, "tally_source_id")


def downgrade() -> None:
    for table, uq, ix in (
        (
            "yorapet_purchase",
            "uq_yorapet_purchase_tally_source_id",
            "ix_yorapet_purchase_tally_source_id",
        ),
        (
            "yorapet_sales",
            "uq_yorapet_sales_tally_source_id",
            "ix_yorapet_sales_tally_source_id",
        ),
    ):
        op.add_column(
            table,
            sa.Column("tally_source_id", sa.BigInteger(), nullable=True),
        )
        op.execute(
            sa.text(
                f"UPDATE {table} SET tally_source_id = id WHERE tally_source_id IS NULL"
            ),
        )
        op.alter_column(
            table,
            "tally_source_id",
            existing_type=sa.BigInteger(),
            nullable=False,
        )
        op.create_unique_constraint(uq, table, ["tally_source_id"])
        op.create_index(ix, table, ["tally_source_id"], unique=False)
        op.drop_index(f"ix_{table}_sync_key", table_name=table)
        op.drop_constraint(f"uq_{table}_sync_key", table_name=table, type_="unique")
        op.drop_column(table, "sync_key")
