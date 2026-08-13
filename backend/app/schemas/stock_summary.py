"""Stock summary report schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class StockSummaryItem(BaseModel):
    """One stock item row for the stock summary report."""

    stock_item: str
    stock_group: str | None = None
    opening_qty: float
    purchase_qty: float
    sales_qty: float
    closing_qty: float
    closing_rate: float | None = None
    closing_value: float | None = None
    # Reorder: last 30 days sales qty (inclusive of as_on); below when closing < that.
    sales_30d_qty: float = 0.0
    reorder_level: float = 0.0
    days_cover: float | None = None
    below_reorder: bool = False


class StockSummaryResponse(BaseModel):
    """Stock summary as on a single date."""

    as_on: str
    items: list[StockSummaryItem] = Field(default_factory=list)
