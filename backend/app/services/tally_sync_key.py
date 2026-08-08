"""Stable sync keys for Tally → yorapet matching (no Tally numeric ids)."""

from __future__ import annotations

import hashlib
from datetime import datetime
from decimal import Decimal


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


def compute_sync_key(*parts: object | None) -> str:
    """SHA-256 hex digest over normalized identity parts."""
    payload = "\0".join(_part(part) for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def purchase_sync_key(
    *,
    voucher_no: str | None,
    voucher_date: datetime | None,
    ledger_name: str | None,
    itemno: float | Decimal | None,
    stock_item: str | None,
    brand: str | None = None,
    packing: float | Decimal | None = None,
    qty: float | Decimal | None = None,
    weight: float | Decimal | None = None,
    rate: float | Decimal | None = None,
    amount: float | Decimal | None = None,
    broker: str | None = None,
    box: float | Decimal | None = None,
    qty_per_box: float | Decimal | None = None,
) -> str:
    """Content identity for a purchase line (stable across Tally id changes)."""
    return compute_sync_key(
        "purchase",
        voucher_no,
        voucher_date,
        ledger_name,
        broker,
        itemno,
        stock_item,
        brand,
        packing,
        qty,
        weight,
        rate,
        amount,
        box,
        qty_per_box,
    )


def sale_sync_key(
    *,
    voucher_no: str | None,
    voucher_date: datetime | None,
    ledger_name: str | None,
    item_no: float | Decimal | None,
    stock_item: str | None,
    brand: str | None = None,
    packing: float | Decimal | None = None,
    qty: float | Decimal | None = None,
    rate: float | Decimal | None = None,
    amount: float | Decimal | None = None,
    discount: float | Decimal | None = None,
    cartage: str | None = None,
    broker: str | None = None,
) -> str:
    """Content identity for a sales line (stable across Tally id changes)."""
    return compute_sync_key(
        "sale",
        voucher_no,
        voucher_date,
        ledger_name,
        broker,
        item_no,
        stock_item,
        brand,
        packing,
        qty,
        rate,
        amount,
        discount,
        cartage,
    )
