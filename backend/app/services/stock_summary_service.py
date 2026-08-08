"""Stock summary: opening + purchase - sales as-on, with FIFO closing rate."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from app.models.opening_stock import YorapetOpeningStock
from app.models.purchase import YorapetPurchase
from app.models.sale import YorapetSale
from app.repositories.opening_stock_repository import OpeningStockRepository
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.tally_inventory_master_repository import (
    TallyInventoryMasterRepository,
)
from app.schemas.stock_summary import StockSummaryItem, StockSummaryResponse
from app.services.stock_fifo import (
    StockMovement,
    compute_fifo_avg_prices_by_item,
    opening_to_movement,
    purchase_to_movement,
    sale_to_movement,
)


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


@dataclass
class _QtyBucket:
    opening_qty: float = 0.0
    purchase_qty: float = 0.0
    sales_qty: float = 0.0

    @property
    def closing_qty(self) -> float:
        return self.opening_qty + self.purchase_qty - self.sales_qty


class StockSummaryService:
    """Build stock summary rows as on a single date."""

    def __init__(
        self,
        openings: OpeningStockRepository,
        purchases: PurchaseRepository,
        sales: SaleRepository,
        inventory_master: TallyInventoryMasterRepository,
    ) -> None:
        self._openings = openings
        self._purchases = purchases
        self._sales = sales
        self._inventory_master = inventory_master

    async def summarize(self, *, as_on: date) -> StockSummaryResponse:
        opening_rows = await self._openings.list_all()
        purchase_rows = await self._purchases.list_all()
        sale_rows = await self._sales.list_all()
        stock_groups = await self._inventory_master.stock_group_by_item()

        buckets = self._build_qty_buckets(
            opening_rows=opening_rows,
            purchase_rows=purchase_rows,
            sale_rows=sale_rows,
            as_on=as_on,
        )

        fifo_movements = self._fifo_movements_through(
            opening_rows=opening_rows,
            purchase_rows=purchase_rows,
            sale_rows=sale_rows,
            as_on=as_on,
        )
        fifo_rates = compute_fifo_avg_prices_by_item(fifo_movements)

        items = [
            StockSummaryItem(
                stock_item=stock_item,
                stock_group=stock_groups.get(stock_item.lower()) or None,
                opening_qty=round(bucket.opening_qty, 2),
                purchase_qty=round(bucket.purchase_qty, 2),
                sales_qty=round(bucket.sales_qty, 2),
                closing_qty=round(bucket.closing_qty, 2),
                closing_rate=(
                    round(fifo_rates[stock_item], 2)
                    if stock_item in fifo_rates
                    and fifo_rates[stock_item] is not None
                    and bucket.closing_qty > 0
                    else None
                ),
            )
            for stock_item, bucket in buckets.items()
            if stock_item
            and (
                abs(bucket.opening_qty) > 1e-9
                or abs(bucket.purchase_qty) > 1e-9
                or abs(bucket.sales_qty) > 1e-9
                or abs(bucket.closing_qty) > 1e-9
            )
        ]
        items.sort(
            key=lambda row: (
                (row.stock_group or "").lower(),
                row.stock_item.lower(),
            ),
        )

        return StockSummaryResponse(as_on=as_on.isoformat(), items=items)

    def _build_qty_buckets(
        self,
        *,
        opening_rows: list[YorapetOpeningStock],
        purchase_rows: list[YorapetPurchase],
        sale_rows: list[YorapetSale],
        as_on: date,
    ) -> dict[str, _QtyBucket]:
        """As-on snapshot: cumulative opening / purchase / sales through as_on."""
        buckets: dict[str, _QtyBucket] = {}

        def bucket_for(stock_item: str) -> _QtyBucket:
            item = stock_item.strip()
            if item not in buckets:
                buckets[item] = _QtyBucket()
            return buckets[item]

        for row in opening_rows:
            item = (row.stock_item or "").strip()
            row_date = _as_date(row.opening_date)
            if not item or row_date is None or row_date > as_on:
                continue
            bucket_for(item).opening_qty += _qty(row.qty)

        for row in purchase_rows:
            item = (row.stock_item or "").strip()
            row_date = _as_date(row.voucher_date)
            if not item or row_date is None or row_date > as_on:
                continue
            bucket_for(item).purchase_qty += _qty(row.qty)

        for row in sale_rows:
            item = (row.stock_item or "").strip()
            row_date = _as_date(row.voucher_date)
            if not item or row_date is None or row_date > as_on:
                continue
            bucket_for(item).sales_qty += _qty(row.qty)

        return buckets

    def _fifo_movements_through(
        self,
        *,
        opening_rows: list[YorapetOpeningStock],
        purchase_rows: list[YorapetPurchase],
        sale_rows: list[YorapetSale],
        as_on: date,
    ) -> list[StockMovement]:
        movements: list[StockMovement] = []

        for row in opening_rows:
            row_date = _as_date(row.opening_date)
            if row_date is None or row_date > as_on:
                continue
            if not (row.stock_item or "").strip():
                continue
            movements.append(opening_to_movement(row))

        for row in purchase_rows:
            row_date = _as_date(row.voucher_date)
            if row_date is None or row_date > as_on:
                continue
            if not (row.stock_item or "").strip():
                continue
            movements.append(purchase_to_movement(row))

        for row in sale_rows:
            row_date = _as_date(row.voucher_date)
            if row_date is None or row_date > as_on:
                continue
            if not (row.stock_item or "").strip():
                continue
            movements.append(sale_to_movement(row))

        return movements
