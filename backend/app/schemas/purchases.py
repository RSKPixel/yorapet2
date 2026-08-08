"""Purchases report response schemas."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class PurchaseLineResponse(BaseModel):
    """One synced purchase line from yorapet_purchase."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    sync_key: str
    voucher_no: str | None
    voucher_date: datetime | None
    ledger_name: str | None
    broker: str | None
    item_count: Decimal | None
    itemno: Decimal | None
    stock_item: str | None
    brand: str | None
    packing: Decimal | None
    qty: Decimal | None
    weight: Decimal | None
    rate: Decimal | None
    amount: Decimal | None
    box: Decimal | None = None
    qty_per_box: Decimal | None = None
    value_addition: Decimal | None = None
    cost_value: Decimal | None = None
    cost_price: Decimal | None = None
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
        "itemno",
        "packing",
        "qty",
        "weight",
        "rate",
        "amount",
        "box",
        "qty_per_box",
        "value_addition",
        "cost_value",
        "cost_price",
    )
    def serialize_decimals(self, value: Decimal | None) -> float | None:
        if value is None:
            return None
        return float(value)


class PurchaseListResponse(BaseModel):
    """Purchase lines for the reports screen."""

    items: list[PurchaseLineResponse] = Field(default_factory=list)
