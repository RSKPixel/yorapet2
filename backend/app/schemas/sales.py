"""Sales report response schemas."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class SaleLineResponse(BaseModel):
    """One synced sales line from yorapet_sales."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    sync_key: str
    voucher_no: str | None
    voucher_date: datetime | None
    ledger_name: str | None
    broker: str | None
    item_count: Decimal | None
    item_no: Decimal | None
    stock_item: str | None
    brand: str | None
    packing: Decimal | None
    qty: Decimal | None
    rate: Decimal | None
    amount: Decimal | None
    discount: Decimal | None
    cartage: str | None
    synced_at: datetime

    @field_serializer("voucher_date", "synced_at")
    def serialize_datetimes(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()

    @field_serializer(
        "item_count",
        "item_no",
        "packing",
        "qty",
        "rate",
        "amount",
        "discount",
    )
    def serialize_decimals(self, value: Decimal | None) -> float | None:
        if value is None:
            return None
        return float(value)


class SaleListResponse(BaseModel):
    """Sales lines for the reports screen."""

    items: list[SaleLineResponse] = Field(default_factory=list)
