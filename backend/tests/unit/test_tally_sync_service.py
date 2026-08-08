"""Unit tests for TallySyncService (voucher-based sync rules)."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.tally_sync_key import purchase_sync_key, sale_sync_key
from app.services.tally_sync_service import TallySyncService, _PurchaseSnapshot


def _purchase_key(**overrides: object) -> str:
    base = {
        "voucher_no": "P-100",
        "voucher_date": datetime(2026, 1, 15, 10, 30, 0),
        "ledger_name": "Vendor A",
        "itemno": 1.0,
        "stock_item": "Item A",
        "brand": "Brand A",
        "packing": 12.0,
        "qty": 24.0,
        "weight": 24.0,
        "rate": 100.0,
        "amount": 2400.0,
        "broker": "Broker 1",
        "box": 2.0,
        "qty_per_box": 12.0,
    }
    base.update(overrides)
    return purchase_sync_key(**base)  # type: ignore[arg-type]


def _sale_key(**overrides: object) -> str:
    base = {
        "voucher_no": "S-200",
        "voucher_date": datetime(2026, 2, 1, 9, 0, 0),
        "ledger_name": "Buyer A",
        "item_no": 1.0,
        "stock_item": "Item B",
        "brand": "Brand B",
        "packing": 6.0,
        "qty": 12.0,
        "rate": 50.0,
        "amount": 600.0,
        "discount": 0.0,
        "cartage": "0",
        "broker": "Rep 1",
    }
    base.update(overrides)
    return sale_sync_key(**base)  # type: ignore[arg-type]


def _tally_purchase_row(**overrides: object) -> SimpleNamespace:
    base = {
        "id": 1,
        "voucher_no": "P-100",
        "voucher_date": datetime(2026, 1, 15, 10, 30, 0),
        "ledger_name": "Vendor A",
        "broker": "Broker 1",
        "item_count": 2.0,
        "itemno": 1.0,
        "stock_item": "Item A",
        "brand": "Brand A",
        "packing": 12.0,
        "qty": 24.0,
        "weight": 24.0,
        "rate": 100.0,
        "amount": 2400.0,
        "box": 2.0,
        "qty_per_box": 12.0,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _yorapet_purchase_row(**overrides: object) -> SimpleNamespace:
    base = {
        "sync_key": _purchase_key(),
        "voucher_no": "P-100",
        "voucher_date": datetime(2026, 1, 15, 10, 30, 0),
        "ledger_name": "Vendor A",
        "broker": "Broker 1",
        "item_count": 2.0,
        "itemno": 1.0,
        "stock_item": "Item A",
        "brand": "Brand A",
        "packing": 12.0,
        "qty": 24.0,
        "weight": 24.0,
        "rate": 100.0,
        "amount": 2400.0,
        "box": 2.0,
        "qty_per_box": 12.0,
        "value_addition": None,
        "cost_value": 2400.0,
        "cost_price": 100.0,
    }
    base.update(overrides)
    if "sync_key" not in overrides:
        base["sync_key"] = _purchase_key(
            voucher_no=base["voucher_no"],
            voucher_date=base["voucher_date"],
            ledger_name=base["ledger_name"],
            itemno=base["itemno"],
            stock_item=base["stock_item"],
            brand=base["brand"],
            packing=base["packing"],
            qty=base["qty"],
            weight=base["weight"],
            rate=base["rate"],
            amount=base["amount"],
            broker=base["broker"],
            box=base["box"],
            qty_per_box=base["qty_per_box"],
        )
    return SimpleNamespace(**base)


def _tally_sale_row(**overrides: object) -> SimpleNamespace:
    base = {
        "id": 10,
        "voucher_no": "S-200",
        "voucher_date": datetime(2026, 2, 1, 9, 0, 0),
        "ledger_name": "Buyer A",
        "broker": "Rep 1",
        "item_count": 1.0,
        "item_no": 1.0,
        "stock_item": "Item B",
        "brand": "Brand B",
        "packing": 6.0,
        "qty": 12.0,
        "rate": 50.0,
        "amount": 600.0,
        "discount": 0.0,
        "cartage": "0",
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _yorapet_sale_row(**overrides: object) -> SimpleNamespace:
    base = {
        "sync_key": _sale_key(),
        "voucher_no": "S-200",
        "voucher_date": datetime(2026, 2, 1, 9, 0, 0),
        "ledger_name": "Buyer A",
        "broker": "Rep 1",
        "item_count": 1.0,
        "item_no": 1.0,
        "stock_item": "Item B",
        "brand": "Brand B",
        "packing": 6.0,
        "qty": 12.0,
        "rate": 50.0,
        "amount": 600.0,
        "discount": 0.0,
        "cartage": "0",
    }
    base.update(overrides)
    if "sync_key" not in overrides:
        base["sync_key"] = _sale_key(
            voucher_no=base["voucher_no"],
            voucher_date=base["voucher_date"],
            ledger_name=base["ledger_name"],
            item_no=base["item_no"],
            stock_item=base["stock_item"],
            brand=base["brand"],
            packing=base["packing"],
            qty=base["qty"],
            rate=base["rate"],
            amount=base["amount"],
            discount=base["discount"],
            cartage=base["cartage"],
            broker=base["broker"],
        )
    return SimpleNamespace(**base)


def _service(
    *,
    tally_purchases=None,
    purchases=None,
    tally_sales=None,
    sales=None,
) -> TallySyncService:
    return TallySyncService(
        tally_purchases or SimpleNamespace(list_all=AsyncMock(return_value=[])),
        purchases
        or SimpleNamespace(
            list_all=AsyncMock(return_value=[]),
            add=lambda purchase: None,
            delete_by_sync_keys=AsyncMock(return_value=0),
        ),
        tally_sales or SimpleNamespace(list_all=AsyncMock(return_value=[])),
        sales
        or SimpleNamespace(
            list_all=AsyncMock(return_value=[]),
            add=lambda sale: None,
            delete_by_sync_keys=AsyncMock(return_value=0),
        ),
    )  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_sync_adds_voucher_only_in_tally() -> None:
    added: list[object] = []
    service = _service(
        tally_purchases=SimpleNamespace(
            list_all=AsyncMock(return_value=[_tally_purchase_row()]),
        ),
        purchases=SimpleNamespace(
            list_all=AsyncMock(return_value=[]),
            add=added.append,
            delete_by_sync_keys=AsyncMock(return_value=0),
        ),
    )

    result = await service.sync()

    assert result.steps[0].added == 1
    assert result.steps[0].updated == 0
    assert result.steps[0].removed == 0
    assert len(added) == 1


@pytest.mark.asyncio
async def test_sync_deletes_voucher_only_in_yorapet_within_period() -> None:
    stale = _yorapet_sale_row(voucher_no="S-GONE", voucher_date=datetime(2026, 2, 15))
    sales_repo = SimpleNamespace(
        list_all=AsyncMock(return_value=[stale]),
        add=lambda sale: None,
        delete_by_sync_keys=AsyncMock(return_value=1),
    )
    service = _service(
        tally_sales=SimpleNamespace(
            list_all=AsyncMock(
                return_value=[
                    _tally_sale_row(voucher_date=datetime(2026, 2, 1)),
                    _tally_sale_row(
                        id=11,
                        voucher_no="S-201",
                        voucher_date=datetime(2026, 2, 28),
                    ),
                ],
            ),
        ),
        sales=sales_repo,
    )

    result = await service.sync()

    assert result.steps[1].removed == 1
    sales_repo.delete_by_sync_keys.assert_awaited()
    deleted_keys = sales_repo.delete_by_sync_keys.await_args.args[0]
    assert stale.sync_key in deleted_keys


@pytest.mark.asyncio
async def test_sync_keeps_yorapet_voucher_outside_period() -> None:
    outside = _yorapet_sale_row(
        voucher_no="S-OLD",
        voucher_date=datetime(2025, 12, 1),
    )
    sales_repo = SimpleNamespace(
        list_all=AsyncMock(return_value=[outside]),
        add=lambda sale: None,
        delete_by_sync_keys=AsyncMock(return_value=0),
    )
    service = _service(
        tally_sales=SimpleNamespace(
            list_all=AsyncMock(
                return_value=[
                    _tally_sale_row(voucher_date=datetime(2026, 2, 1)),
                    _tally_sale_row(
                        id=11,
                        voucher_no="S-201",
                        voucher_date=datetime(2026, 2, 28),
                    ),
                ],
            ),
        ),
        sales=sales_repo,
    )

    result = await service.sync()

    assert result.steps[1].removed == 0
    # Outside-period row must not be deleted; only update/add of in-period vouchers.
    deleted_keys = sales_repo.delete_by_sync_keys.await_args.args[0]
    assert outside.sync_key not in deleted_keys


@pytest.mark.asyncio
async def test_sync_update_replaces_matching_voucher_lines() -> None:
    existing_line = _yorapet_purchase_row()
    added: list[object] = []
    purchases_repo = SimpleNamespace(
        list_all=AsyncMock(return_value=[existing_line]),
        add=added.append,
        delete_by_sync_keys=AsyncMock(return_value=1),
    )
    # Same voucher_no, changed amount → update = delete yorapet lines, add tally lines.
    service = _service(
        tally_purchases=SimpleNamespace(
            list_all=AsyncMock(return_value=[_tally_purchase_row(amount=2500.0)]),
        ),
        purchases=purchases_repo,
    )

    result = await service.sync()

    assert result.steps[0].added == 0
    assert result.steps[0].updated == 1
    assert result.steps[0].removed == 0
    purchases_repo.delete_by_sync_keys.assert_awaited_once_with([existing_line.sync_key])
    assert len(added) == 1
    assert added[0].amount == 2500.0
    assert float(added[0].cost_value) == 2500.0
    assert float(added[0].cost_price) == round(2500 / 24, 2)


@pytest.mark.asyncio
async def test_sync_keeps_rows_when_tally_snapshot_is_empty() -> None:
    stale_row = _yorapet_sale_row()
    sales_repo = SimpleNamespace(
        list_all=AsyncMock(return_value=[stale_row]),
        add=lambda sale: None,
        delete_by_sync_keys=AsyncMock(return_value=0),
    )
    service = _service(sales=sales_repo)

    result = await service.sync()

    assert result.steps[1].removed == 0
    sales_repo.delete_by_sync_keys.assert_awaited_once_with([])


def test_purchase_sync_key_ignores_tally_id() -> None:
    left = _PurchaseSnapshot.from_tally(_tally_purchase_row(id=1))
    right = _PurchaseSnapshot.from_tally(_tally_purchase_row(id=99))
    assert left.sync_key == right.sync_key
    assert left.voucher_group_key == right.voucher_group_key
