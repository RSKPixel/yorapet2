"""FIFO stock valuation from opening, purchase, and sales movements."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class StockMovement:
    stock_item: str
    movement_date: datetime
    qty: Decimal
    unit_cost: Decimal | None
    movement_type: str
    sort_primary: int
    sort_secondary: int


def _dec(value: Decimal | float | int | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _movement_sort_key(
    movement: StockMovement,
) -> tuple[datetime, int, int, str]:
    return (
        movement.movement_date,
        movement.sort_primary,
        movement.sort_secondary,
        movement.movement_type,
    )


def compute_fifo_avg_price(movements: list[StockMovement]) -> float | None:
    """Return weighted-average unit cost of FIFO remaining layers."""
    if not movements:
        return None

    ordered = sorted(movements, key=_movement_sort_key)
    layers: list[list[Decimal]] = []

    for movement in ordered:
        if movement.qty > 0:
            unit_cost = (
                movement.unit_cost
                if movement.unit_cost is not None
                else Decimal("0")
            )
            layers.append([movement.qty, unit_cost])
            continue

        if movement.qty == 0:
            continue

        remaining = -movement.qty
        while remaining > 0 and layers:
            layer_qty, layer_cost = layers[0]
            if layer_qty <= remaining:
                remaining -= layer_qty
                layers.pop(0)
            else:
                layers[0][0] = layer_qty - remaining
                remaining = Decimal("0")

    total_qty = sum((layer[0] for layer in layers), Decimal("0"))
    if total_qty <= 0:
        return None

    total_value = sum((layer[0] * layer[1] for layer in layers), Decimal("0"))
    return float(total_value / total_qty)


def compute_fifo_avg_prices_by_item(
    movements: list[StockMovement],
) -> dict[str, float | None]:
    """Compute FIFO average price for each stock item."""
    grouped: dict[str, list[StockMovement]] = {}
    for movement in movements:
        if not movement.stock_item:
            continue
        grouped.setdefault(movement.stock_item, []).append(movement)

    return {
        stock_item: compute_fifo_avg_price(item_movements)
        for stock_item, item_movements in grouped.items()
    }


def opening_to_movement(row: object) -> StockMovement:
    return StockMovement(
        stock_item=str(getattr(row, "stock_item") or "").strip(),
        movement_date=getattr(row, "opening_date"),
        qty=_dec(getattr(row, "qty", None)),
        unit_cost=_dec(getattr(row, "opening_rate", None)),
        movement_type="opening",
        sort_primary=int(getattr(row, "id") or 0),
        sort_secondary=0,
    )


def purchase_to_movement(row: object) -> StockMovement:
    cost_price = getattr(row, "cost_price", None)
    unit_cost = _dec(cost_price) if cost_price is not None else _dec(getattr(row, "rate", None))
    return StockMovement(
        stock_item=str(getattr(row, "stock_item") or "").strip(),
        movement_date=getattr(row, "voucher_date"),
        qty=_dec(getattr(row, "qty", None)),
        unit_cost=unit_cost,
        movement_type="purchase",
        sort_primary=int(getattr(row, "id") or 0),
        sort_secondary=int(_dec(getattr(row, "itemno", None))),
    )


def sale_to_movement(row: object) -> StockMovement:
    return StockMovement(
        stock_item=str(getattr(row, "stock_item") or "").strip(),
        movement_date=getattr(row, "voucher_date"),
        qty=-_dec(getattr(row, "qty", None)),
        unit_cost=None,
        movement_type="sale",
        sort_primary=int(getattr(row, "id") or 0),
        sort_secondary=int(_dec(getattr(row, "item_no", None))),
    )
