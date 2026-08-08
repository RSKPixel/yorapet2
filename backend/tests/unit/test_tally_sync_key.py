"""Unit tests for Tally sync_key hashing."""

from __future__ import annotations

from datetime import datetime

from app.services.tally_sync_key import purchase_sync_key, sale_sync_key


def test_purchase_sync_key_is_stable_64_hex() -> None:
    key = purchase_sync_key(
        voucher_no="P-100",
        voucher_date=datetime(2026, 1, 15, 10, 30, 0),
        ledger_name="Vendor A",
        itemno=1.0,
        stock_item="Item A",
        brand="Brand A",
        packing=12.0,
        qty=24.0,
        weight=24.0,
        rate=100.0,
        amount=2400.0,
        broker="Broker 1",
    )
    assert len(key) == 64
    assert key == purchase_sync_key(
        voucher_no=" p-100 ",
        voucher_date=datetime(2026, 1, 15, 23, 59, 59),
        ledger_name="VENDOR A",
        itemno=1.0,
        stock_item="item a",
        brand="brand a",
        packing=12.0,
        qty=24.0,
        weight=24.0,
        rate=100.0,
        amount=2400.0,
        broker="broker 1",
    )


def test_sale_sync_key_differs_by_voucher() -> None:
    left = sale_sync_key(
        voucher_no="S-1",
        voucher_date=datetime(2026, 2, 1),
        ledger_name="Buyer",
        item_no=1,
        stock_item="Item",
        qty=1,
        rate=10,
        amount=10,
    )
    right = sale_sync_key(
        voucher_no="S-2",
        voucher_date=datetime(2026, 2, 1),
        ledger_name="Buyer",
        item_no=1,
        stock_item="Item",
        qty=1,
        rate=10,
        amount=10,
    )
    assert left != right
