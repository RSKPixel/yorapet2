"""Stock summary from tallydata_stockposition with sales overlays."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from app.models.purchase import YorapetPurchase
from app.models.sale import YorapetSale
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.tally_stock_position_repository import TallyStockPositionRepository
from app.schemas.stock_summary import (
    StockPnlItem,
    StockPnlResponse,
    StockSummaryItem,
    StockSummaryResponse,
)

REORDER_DAYS = 30


def compute_stock_pnl(
    *,
    cost_price: float | None,
    avg_sell_price: float | None,
    sell_qty: float,
) -> tuple[float | None, float | None]:
    """Return (profit_per_unit, pnl_amount) for one stock item."""
    if cost_price is None or avg_sell_price is None:
        return None, None
    profit_per_unit = round(avg_sell_price - cost_price, 2)
    if sell_qty <= 1e-9:
        return profit_per_unit, 0.0
    return profit_per_unit, round(profit_per_unit * sell_qty, 2)


def _as_date(value: datetime | date | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def _qty(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def _display_closing_value(raw: float | None) -> float | None:
    """Tally stores closing value as credit (negative); display as positive."""
    if raw is None:
        return None
    return round(float(raw) * -1, 2)


def sales_30d_qty_by_item(
    sale_rows: list[YorapetSale],
    *,
    as_of: date,
) -> dict[str, float]:
    """Sum sales qty per stock item over the last REORDER_DAYS ending on as_of."""
    sales_from = as_of - timedelta(days=REORDER_DAYS - 1)
    totals: dict[str, float] = {}
    for row in sale_rows:
        item = (row.stock_item or "").strip()
        row_date = _as_date(row.voucher_date)
        if not item or row_date is None:
            continue
        if row_date < sales_from or row_date > as_of:
            continue
        totals[item] = totals.get(item, 0.0) + _qty(row.qty)
    return totals


def sales_qty_by_item(sale_rows: list[YorapetSale]) -> dict[str, float]:
    """Sum all sales qty per stock item."""
    totals: dict[str, float] = {}
    for row in sale_rows:
        item = (row.stock_item or "").strip()
        if not item:
            continue
        totals[item] = totals.get(item, 0.0) + _qty(row.qty)
    return totals


def filter_sales_by_date_range(
    sale_rows: list[YorapetSale],
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[YorapetSale]:
    """Keep sale rows whose voucher date falls within the inclusive range."""
    if date_from is None and date_to is None:
        return sale_rows
    filtered: list[YorapetSale] = []
    for row in sale_rows:
        row_date = _as_date(row.voucher_date)
        if row_date is None:
            continue
        if date_from is not None and row_date < date_from:
            continue
        if date_to is not None and row_date > date_to:
            continue
        filtered.append(row)
    return filtered


def avg_selling_price_by_item(sale_rows: list[YorapetSale]) -> dict[str, float]:
    """Weighted average selling price: sum(amount) / sum(qty) per item."""
    qty_totals: dict[str, float] = {}
    amount_totals: dict[str, float] = {}
    for row in sale_rows:
        item = (row.stock_item or "").strip()
        qty = _qty(row.qty)
        if not item or qty <= 1e-9:
            continue
        amount = _qty(row.amount)
        if abs(amount) <= 1e-9 and row.rate is not None:
            amount = qty * _qty(row.rate)
        qty_totals[item] = qty_totals.get(item, 0.0) + qty
        amount_totals[item] = amount_totals.get(item, 0.0) + amount

    averages: dict[str, float] = {}
    for item, total_qty in qty_totals.items():
        if total_qty <= 1e-9:
            continue
        averages[item] = round(amount_totals.get(item, 0.0) / total_qty, 2)
    return averages


def _trim_layers_to_closing_qty(
    layers: list[tuple[float, YorapetPurchase]],
    closing_qty: float,
) -> list[tuple[float, YorapetPurchase]]:
    """Keep newest lots totaling closing_qty (trim oldest first)."""
    if closing_qty <= 1e-9:
        return []
    total = sum(qty for qty, _ in layers)
    if total <= closing_qty + 1e-9:
        return layers
    trimmed: list[tuple[float, YorapetPurchase]] = []
    keep = closing_qty
    for qty, purchase in reversed(layers):
        if keep <= 1e-9:
            break
        take = min(qty, keep)
        trimmed.append((take, purchase))
        keep -= take
    return list(reversed(trimmed))


def fifo_remaining_purchase_layers(
    purchase_rows: list[YorapetPurchase],
    sale_rows: list[YorapetSale],
    *,
    as_of: date,
) -> dict[str, list[tuple[float, YorapetPurchase]]]:
    """Return FIFO remaining purchase lots per item (oldest first)."""
    events: dict[str, list[tuple[date, int, str, float, YorapetPurchase | None]]] = {}

    for row in purchase_rows:
        item = (row.stock_item or "").strip()
        row_date = _as_date(row.voucher_date)
        qty = _qty(row.qty)
        if not item or row_date is None or qty <= 1e-9 or row_date > as_of:
            continue
        events.setdefault(item, []).append(
            (row_date, int(getattr(row, "id", 0) or 0), "in", qty, row),
        )

    for row in sale_rows:
        item = (row.stock_item or "").strip()
        row_date = _as_date(row.voucher_date)
        qty = _qty(row.qty)
        if not item or row_date is None or qty <= 1e-9 or row_date > as_of:
            continue
        events.setdefault(item, []).append(
            (row_date, int(getattr(row, "id", 0) or 0), "out", qty, None),
        )

    remaining_by_item: dict[str, list[tuple[float, YorapetPurchase]]] = {}
    for item, item_events in events.items():
        item_events.sort(key=lambda event: (event[0], event[1], event[2]))
        layers: list[list[object]] = []  # [qty, purchase]
        shortfall = 0.0

        for _layer_date, _row_id, kind, qty, purchase in item_events:
            if kind == "in" and purchase is not None:
                incoming = qty
                if shortfall > 1e-9:
                    covered = min(incoming, shortfall)
                    shortfall -= covered
                    incoming -= covered
                if incoming > 1e-9:
                    layers.append([incoming, purchase])
                continue

            remaining = qty
            while remaining > 1e-9 and layers:
                layer_qty = float(layers[0][0])
                if layer_qty <= remaining + 1e-9:
                    remaining -= layer_qty
                    layers.pop(0)
                else:
                    layers[0][0] = layer_qty - remaining
                    remaining = 0.0
            if remaining > 1e-9:
                shortfall += remaining

        result_layers: list[tuple[float, YorapetPurchase]] = []
        for layer_qty, purchase in layers:
            qty = float(layer_qty)
            if purchase is not None and qty > 1e-9:
                result_layers.append((qty, purchase))  # type: ignore[arg-type]
        if result_layers:
            remaining_by_item[item] = result_layers

    return remaining_by_item


def avg_weighted_age_days_by_item(
    purchase_rows: list[YorapetPurchase],
    sale_rows: list[YorapetSale],
    *,
    as_of: date,
    closing_qty_by_item: dict[str, float] | None = None,
) -> dict[str, float]:
    """FIFO remaining-layer age in days, qty-weighted, as of as_of."""
    ages: dict[str, float] = {}
    remaining = fifo_remaining_purchase_layers(
        purchase_rows,
        sale_rows,
        as_of=as_of,
    )
    for item, layers in remaining.items():
        if closing_qty_by_item is not None and item in closing_qty_by_item:
            layers = _trim_layers_to_closing_qty(layers, closing_qty_by_item[item])
        total_qty = sum(remaining_qty for remaining_qty, _row in layers)
        if total_qty <= 1e-9:
            continue
        weighted_days = 0.0
        for remaining_qty, purchase in layers:
            layer_date = _as_date(purchase.voucher_date)
            if layer_date is None:
                continue
            weighted_days += remaining_qty * max(0, (as_of - layer_date).days)
        ages[item] = float(round(weighted_days / total_qty))
    return ages


class StockSummaryService:
    """Build stock summary rows from Tally closing position + sales overlays."""

    def __init__(
        self,
        positions: TallyStockPositionRepository,
        sales: SaleRepository,
        purchases: PurchaseRepository,
    ) -> None:
        self._positions = positions
        self._sales = sales
        self._purchases = purchases

    async def summarize(self, *, as_of: date | None = None) -> StockSummaryResponse:
        as_of = as_of or date.today()
        position_rows = await self._positions.list_all()
        sale_rows = await self._sales.list_all()
        purchase_rows = await self._purchases.list_all()
        sales_30d = sales_30d_qty_by_item(sale_rows, as_of=as_of)
        avg_sell = avg_selling_price_by_item(sale_rows)
        closing_qty_by_item = {
            (row.stock_item or "").strip(): _qty(row.closing_qty)
            for row in position_rows
            if (row.stock_item or "").strip()
        }
        avg_age = avg_weighted_age_days_by_item(
            purchase_rows,
            sale_rows,
            as_of=as_of,
            closing_qty_by_item=closing_qty_by_item,
        )

        items: list[StockSummaryItem] = []
        for row in position_rows:
            stock_item = (row.stock_item or "").strip()
            if not stock_item:
                continue

            closing_qty = round(_qty(row.closing_qty), 2)
            closing_rate = (
                round(float(row.closing_rate), 2)
                if row.closing_rate is not None
                else None
            )
            closing_value = _display_closing_value(row.closing_value)
            avg_selling_price = avg_sell.get(stock_item)
            avg_weighted_age_days = avg_age.get(stock_item)
            sales_30d_qty = round(sales_30d.get(stock_item, 0.0), 2)
            reorder_level = sales_30d_qty
            days_cover = (
                round(closing_qty / (sales_30d_qty / REORDER_DAYS), 1)
                if sales_30d_qty > 1e-9
                else None
            )
            below_reorder = sales_30d_qty > 1e-9 and closing_qty < sales_30d_qty
            items.append(
                StockSummaryItem(
                    stock_item=stock_item,
                    stock_group=(row.stock_group or "").strip() or None,
                    closing_qty=closing_qty,
                    closing_rate=closing_rate,
                    avg_selling_price=avg_selling_price,
                    avg_weighted_age_days=avg_weighted_age_days,
                    closing_value=closing_value,
                    sales_30d_qty=sales_30d_qty,
                    reorder_level=reorder_level,
                    days_cover=days_cover,
                    below_reorder=below_reorder,
                ),
            )

        items.sort(
            key=lambda item: (
                (item.stock_group or "").lower(),
                item.stock_item.lower(),
            ),
        )
        return StockSummaryResponse(items=items)

    async def pnl_summary(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> StockPnlResponse:
        position_rows = await self._positions.list_all()
        sale_rows = filter_sales_by_date_range(
            await self._sales.list_all(),
            date_from=date_from,
            date_to=date_to,
        )
        avg_sell = avg_selling_price_by_item(sale_rows)
        sell_qty_by_item = sales_qty_by_item(sale_rows)

        items: list[StockPnlItem] = []
        for row in position_rows:
            stock_item = (row.stock_item or "").strip()
            if not stock_item:
                continue

            cost_price = (
                round(float(row.closing_rate), 2)
                if row.closing_rate is not None
                else None
            )
            avg_sell_price = avg_sell.get(stock_item)
            sell_qty = round(sell_qty_by_item.get(stock_item, 0.0), 2)
            profit_per_unit, pnl_amount = compute_stock_pnl(
                cost_price=cost_price,
                avg_sell_price=avg_sell_price,
                sell_qty=sell_qty,
            )
            items.append(
                StockPnlItem(
                    stock_item=stock_item,
                    stock_group=(row.stock_group or "").strip() or None,
                    cost_price=cost_price,
                    avg_sell_price=avg_sell_price,
                    sell_qty=sell_qty,
                    profit_per_unit=profit_per_unit,
                    pnl_amount=pnl_amount,
                ),
            )
        items = [item for item in items if item.sell_qty > 1e-9]
        items.sort(
            key=lambda item: (
                item.pnl_amount is None,
                -(item.pnl_amount or 0.0),
                (item.stock_group or "").lower(),
                item.stock_item.lower(),
            ),
        )
        return StockPnlResponse(
            date_from=date_from.isoformat() if date_from else None,
            date_to=date_to.isoformat() if date_to else None,
            items=items,
        )
