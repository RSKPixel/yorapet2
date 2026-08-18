"""Stock summary report schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class StockSummaryItem(BaseModel):
    """One stock item row for the stock summary report."""

    stock_item: str
    stock_group: str | None = None
    closing_qty: float
    closing_rate: float | None = None
    avg_selling_price: float | None = None
    avg_weighted_age_days: float | None = None
    closing_value: float | None = None
    # Reorder: last 30 days sales qty; below when closing < that.
    sales_30d_qty: float = 0.0
    reorder_level: float = 0.0
    days_cover: float | None = None
    below_reorder: bool = False


class StockSummaryResponse(BaseModel):
    """Stock summary from Tally stock position."""

    items: list[StockSummaryItem] = Field(default_factory=list)


class StockPnlItem(BaseModel):
    """One stock item row for the stock-wise P&L report."""

    stock_item: str
    stock_group: str | None = None
    cost_price: float | None = None
    avg_sell_price: float | None = None
    # Total sales qty (all available sales).
    sell_qty: float = 0.0
    profit_per_unit: float | None = None
    pnl_amount: float | None = None


class StockPnlResponse(BaseModel):
    """Stock-wise profit and loss from cost vs average sell price."""

    date_from: str | None = None
    date_to: str | None = None
    items: list[StockPnlItem] = Field(default_factory=list)


class StockSummaryActivityLine(BaseModel):
    """One recent purchase or sale line for a stock item."""

    voucher_no: str | None = None
    voucher_date: str | None = None
    party: str | None = None
    qty: float | None = None
    purchased_qty: float | None = None
    rate: float | None = None
    amount: float | None = None
    # Purchases only: value ÷ qty (cost_value when present, else amount).
    discounted_rate: float | None = None


class StockSummaryActivityResponse(BaseModel):
    """Closing-stock purchase lots and recent sales for one stock item."""

    stock_item: str
    closing_qty: float | None = None
    purchases: list[StockSummaryActivityLine] = Field(default_factory=list)
    sales: list[StockSummaryActivityLine] = Field(default_factory=list)
