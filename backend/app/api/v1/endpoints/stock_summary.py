"""Stock summary report API endpoints."""

from __future__ import annotations

from datetime import UTC, date, datetime

from fastapi import APIRouter, Query

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DbSessionDep
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.tally_stock_position_repository import TallyStockPositionRepository
from app.schemas.stock_summary import (
    StockPnlResponse,
    StockSummaryActivityLine,
    StockSummaryActivityResponse,
    StockSummaryResponse,
)
from app.services.stock_summary_service import (
    StockSummaryService,
    _trim_layers_to_closing_qty,
    fifo_remaining_purchase_layers,
)

router = APIRouter(prefix="/stock-summary", tags=["stock-summary"])

ACTIVITY_LIMIT = 5


def _iso_date(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.date().isoformat()


def _num(value: object) -> float | None:
    if value is None:
        return None
    return float(value)


def _discounted_rate(*, qty: object, cost_value: object, amount: object) -> float | None:
    """Purchase discounted rate = value ÷ qty (prefer cost_value)."""
    qty_n = _num(qty)
    if qty_n is None or abs(qty_n) <= 1e-9:
        return None
    value = _num(cost_value)
    if value is None:
        value = _num(amount)
    if value is None:
        return None
    return round(value / qty_n, 2)


@router.get("", response_model=StockSummaryResponse)
async def get_stock_summary(
    _user: CurrentUserDep,
    session: DbSessionDep,
) -> StockSummaryResponse:
    """Return Tally closing stock position plus 30-day sales reorder flags."""
    return await StockSummaryService(
        TallyStockPositionRepository(session),
        SaleRepository(session),
        PurchaseRepository(session),
    ).summarize()


@router.get("/pnl", response_model=StockPnlResponse)
async def get_stock_pnl(
    _user: CurrentUserDep,
    session: DbSessionDep,
    date_from: date | None = Query(None, description="Inclusive sales from date"),
    date_to: date | None = Query(None, description="Inclusive sales to date"),
) -> StockPnlResponse:
    """Return stock-wise P&L from cost price, avg sell price, and sell qty."""
    if date_from is not None and date_to is not None and date_from > date_to:
        date_from, date_to = date_to, date_from
    return await StockSummaryService(
        TallyStockPositionRepository(session),
        SaleRepository(session),
        PurchaseRepository(session),
    ).pnl_summary(date_from=date_from, date_to=date_to)


@router.get("/activity", response_model=StockSummaryActivityResponse)
async def get_stock_summary_activity(
    _user: CurrentUserDep,
    session: DbSessionDep,
    stock_item: str = Query(..., min_length=1, description="Stock item name"),
) -> StockSummaryActivityResponse:
    """Return closing-stock purchase lots and recent sales for one stock item."""
    item = stock_item.strip()
    as_of = date.today()
    position = await TallyStockPositionRepository(session).get_by_stock_item(item)
    closing_qty = _num(position.closing_qty) if position is not None else None

    purchase_rows = await PurchaseRepository(session).list_all()
    sale_rows = await SaleRepository(session).list_all()
    item_purchases = [
        row for row in purchase_rows if (row.stock_item or "").strip() == item
    ]
    item_sales = [row for row in sale_rows if (row.stock_item or "").strip() == item]

    layers = fifo_remaining_purchase_layers(
        item_purchases,
        item_sales,
        as_of=as_of,
    ).get(item, [])
    if closing_qty is not None:
        layers = _trim_layers_to_closing_qty(layers, closing_qty)

    # Newest lots first in the modal.
    purchase_lines: list[StockSummaryActivityLine] = []
    for remaining_qty, row in reversed(layers):
        disc = _discounted_rate(
            qty=row.qty,
            cost_value=row.cost_value,
            amount=row.amount,
        )
        amount = (
            round(disc * remaining_qty, 2)
            if disc is not None
            else _num(row.amount)
        )
        purchase_lines.append(
            StockSummaryActivityLine(
                voucher_no=row.voucher_no,
                voucher_date=_iso_date(row.voucher_date),
                party=(row.ledger_name or "").strip() or None,
                qty=round(remaining_qty, 2),
                purchased_qty=_num(row.qty),
                rate=_num(row.rate),
                amount=amount,
                discounted_rate=disc,
            ),
        )

    recent_sales = await SaleRepository(session).list_recent_by_stock_item(
        item,
        limit=ACTIVITY_LIMIT,
    )
    return StockSummaryActivityResponse(
        stock_item=item,
        closing_qty=round(closing_qty, 2) if closing_qty is not None else None,
        purchases=purchase_lines,
        sales=[
            StockSummaryActivityLine(
                voucher_no=row.voucher_no,
                voucher_date=_iso_date(row.voucher_date),
                party=(row.ledger_name or "").strip() or None,
                qty=_num(row.qty),
                rate=_num(row.rate),
                amount=_num(row.amount),
            )
            for row in recent_sales
        ],
    )
