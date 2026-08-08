"""Unit tests for FIFO closing-rate calculation."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from app.services.stock_fifo import StockMovement, compute_fifo_avg_price


def test_fifo_avg_price_consumes_oldest_layers_first() -> None:
    movements = [
        StockMovement(
            stock_item="Item A",
            movement_date=datetime(2026, 1, 1),
            qty=Decimal("10"),
            unit_cost=Decimal("100"),
            movement_type="opening",
            sort_primary=1,
            sort_secondary=0,
        ),
        StockMovement(
            stock_item="Item A",
            movement_date=datetime(2026, 1, 5),
            qty=Decimal("10"),
            unit_cost=Decimal("120"),
            movement_type="purchase",
            sort_primary=2,
            sort_secondary=1,
        ),
        StockMovement(
            stock_item="Item A",
            movement_date=datetime(2026, 1, 10),
            qty=Decimal("-12"),
            unit_cost=None,
            movement_type="sale",
            sort_primary=3,
            sort_secondary=1,
        ),
    ]

    # Remaining: 8 @ 120 => avg 120
    assert compute_fifo_avg_price(movements) == 120.0


def test_fifo_avg_price_returns_none_when_fully_sold() -> None:
    movements = [
        StockMovement(
            stock_item="Item A",
            movement_date=datetime(2026, 1, 1),
            qty=Decimal("5"),
            unit_cost=Decimal("50"),
            movement_type="purchase",
            sort_primary=1,
            sort_secondary=0,
        ),
        StockMovement(
            stock_item="Item A",
            movement_date=datetime(2026, 1, 2),
            qty=Decimal("-5"),
            unit_cost=None,
            movement_type="sale",
            sort_primary=2,
            sort_secondary=0,
        ),
    ]

    assert compute_fifo_avg_price(movements) is None
