"""Unit tests for stock summary from tally stock position."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from app.services.stock_summary_service import (
    _display_closing_value,
    _trim_layers_to_closing_qty,
    avg_selling_price_by_item,
    avg_weighted_age_days_by_item,
    compute_stock_pnl,
    fifo_remaining_purchase_layers,
    filter_sales_by_date_range,
    sales_30d_qty_by_item,
    sales_qty_by_item,
)


def test_display_closing_value_negates_tally_credit() -> None:
    assert _display_closing_value(-109926.23) == 109926.23
    assert _display_closing_value(0.0) == 0.0
    assert _display_closing_value(None) is None


@dataclass
class _Sale:
    stock_item: str | None
    voucher_date: datetime | None
    qty: Decimal | float | None
    amount: Decimal | float | None = None
    rate: Decimal | float | None = None


def test_sales_30d_qty_by_item_window() -> None:
    rows = [
        _Sale("Item A", datetime(2026, 8, 1), 10),
        _Sale("Item A", datetime(2026, 7, 1), 100),  # outside 30d of 2026-08-14
        _Sale("Item B", datetime(2026, 8, 10), 5),
        _Sale("Item B", datetime(2026, 8, 15), 9),  # after as_of
    ]
    totals = sales_30d_qty_by_item(rows, as_of=date(2026, 8, 14))
    assert totals == {"Item A": 10.0, "Item B": 5.0}


def test_sales_qty_by_item_all_sales() -> None:
    rows = [
        _Sale("Item A", datetime(2026, 8, 1), 10),
        _Sale("Item A", datetime(2026, 7, 1), 100),
        _Sale("Item B", datetime(2026, 8, 10), 5),
        _Sale("Item B", datetime(2026, 8, 15), 9),
    ]
    totals = sales_qty_by_item(rows)
    assert totals == {"Item A": 110.0, "Item B": 14.0}


def test_filter_sales_by_date_range() -> None:
    rows = [
        _Sale("Item A", datetime(2026, 8, 1), 10),
        _Sale("Item A", datetime(2026, 7, 1), 100),
        _Sale("Item B", datetime(2026, 8, 10), 5),
    ]
    filtered = filter_sales_by_date_range(
        rows,
        date_from=date(2026, 8, 1),
        date_to=date(2026, 8, 14),
    )
    totals = sales_qty_by_item(filtered)
    assert totals == {"Item A": 10.0, "Item B": 5.0}
    averages = avg_selling_price_by_item(filtered)
    assert "Item A" in averages


def test_avg_selling_price_weighted_by_amount() -> None:
    rows = [
        _Sale("Item A", datetime(2026, 8, 1), 10, amount=200),
        _Sale("Item A", datetime(2026, 8, 5), 10, amount=300),
        _Sale("Item B", datetime(2026, 8, 5), 4, amount=None, rate=12.5),
    ]
    averages = avg_selling_price_by_item(rows)
    assert averages["Item A"] == 25.0
    assert averages["Item B"] == 12.5


@dataclass
class _Purchase:
    id: int
    stock_item: str | None
    voucher_date: datetime | None
    qty: Decimal | float | None


def test_avg_weighted_age_days_fifo_remaining() -> None:
    purchases = [
        _Purchase(1, "Item A", datetime(2026, 7, 1), 100),
        _Purchase(2, "Item A", datetime(2026, 8, 1), 50),
    ]
    sales = [
        _Sale("Item A", datetime(2026, 7, 15), 80),
    ]
    # Remaining: 20 @ 1 Jul (44 days to 14 Aug) + 50 @ 1 Aug (13 days)
    # (20*44 + 50*13) / 70 = 21.857... → 22
    ages = avg_weighted_age_days_by_item(
        purchases,
        sales,
        as_of=date(2026, 8, 14),
    )
    assert ages["Item A"] == 22.0


def test_closing_purchase_layers_trimmed_to_closing_qty() -> None:
    purchases = [
        _Purchase(1, "Item A", datetime(2026, 7, 1), 100),
        _Purchase(2, "Item A", datetime(2026, 8, 1), 50),
    ]
    sales = [_Sale("Item A", datetime(2026, 7, 15), 80)]
    layers = fifo_remaining_purchase_layers(
        purchases,
        sales,
        as_of=date(2026, 8, 14),
    )["Item A"]
    trimmed = _trim_layers_to_closing_qty(layers, 50)
    assert len(trimmed) == 1
    assert trimmed[0][0] == 50
    assert trimmed[0][1].id == 2


def test_compute_stock_pnl() -> None:
    assert compute_stock_pnl(cost_price=10.0, avg_sell_price=15.0, sell_qty=20) == (
        5.0,
        100.0,
    )
    assert compute_stock_pnl(cost_price=10.0, avg_sell_price=15.0, sell_qty=0) == (
        5.0,
        0.0,
    )
    assert compute_stock_pnl(cost_price=None, avg_sell_price=15.0, sell_qty=20) == (
        None,
        None,
    )
    assert compute_stock_pnl(cost_price=10.0, avg_sell_price=None, sell_qty=20) == (
        None,
        None,
    )
    assert compute_stock_pnl(cost_price=12.5, avg_sell_price=10.0, sell_qty=4) == (
        -2.5,
        -10.0,
    )

