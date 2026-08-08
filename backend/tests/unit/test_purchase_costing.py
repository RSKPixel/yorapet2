"""Unit tests for purchase costing helpers."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace

from app.services.purchase_costing import (
    apply_overlays_to_lines,
    apply_purchase_costing,
    compute_line_cost,
)
from app.services.stock_fifo import purchase_to_movement


def test_baseline_cost_is_amount() -> None:
    cost_value, cost_price = compute_line_cost(amount=1000, qty=10)
    assert cost_value == Decimal("1000.00")
    assert cost_price == Decimal("100.00")


def test_expense_allocated_by_boxes() -> None:
    lines = [
        SimpleNamespace(
            id=1,
            stock_item="A",
            amount=Decimal("100"),
            qty=Decimal("10"),
            box=Decimal("2"),
            credit_note=Decimal("0"),
            value_addition=None,
            cost_value=None,
            cost_price=None,
        ),
        SimpleNamespace(
            id=2,
            stock_item="B",
            amount=Decimal("300"),
            qty=Decimal("10"),
            box=Decimal("6"),
            credit_note=Decimal("0"),
            value_addition=None,
            cost_value=None,
            cost_price=None,
        ),
    ]
    apply_overlays_to_lines(lines, expenses=Decimal("40"))  # type: ignore[arg-type]
    assert lines[0].value_addition == Decimal("10.00")
    assert lines[0].cost_value == Decimal("110.00")
    assert lines[1].value_addition == Decimal("30.00")
    assert lines[1].cost_value == Decimal("330.00")


def test_manual_credit_note_subtracted() -> None:
    lines = [
        SimpleNamespace(
            id=1,
            stock_item="Item",
            amount=Decimal("1000"),
            qty=Decimal("10"),
            box=Decimal("5"),
            credit_note=Decimal("25"),
            value_addition=None,
            cost_value=None,
            cost_price=None,
        ),
    ]
    apply_overlays_to_lines(lines, expenses=Decimal("50"))  # type: ignore[arg-type]
    assert lines[0].value_addition == Decimal("50.00")
    assert lines[0].cost_value == Decimal("1025.00")
    assert lines[0].cost_price == Decimal("102.50")


def test_apply_purchase_costing_tuple() -> None:
    cost_value, cost_price = apply_purchase_costing(amount=2400, qty=24)
    assert cost_value == Decimal("2400.00")
    assert cost_price == Decimal("100.00")


def test_purchase_to_movement_uses_cost_price() -> None:
    row = type(
        "Purchase",
        (),
        {
            "id": 1,
            "stock_item": "Item A",
            "voucher_date": None,
            "qty": Decimal("10"),
            "itemno": Decimal("1"),
            "rate": Decimal("100"),
            "cost_price": Decimal("112.50"),
        },
    )()
    movement = purchase_to_movement(row)
    assert movement.unit_cost == Decimal("112.50")
