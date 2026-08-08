"""Inventory master response schemas (Tally + app extras)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


class InventoryImageResponse(BaseModel):
    """One stored image for a stock item."""

    id: int
    position: int
    url: str


class InventoryMasterItemResponse(BaseModel):
    """One stock item: Tally master fields plus app-owned extras."""

    model_config = ConfigDict(from_attributes=True)

    tally_id: int
    stock_item: str
    packing: float | None = None
    stock_group: str | None = None
    base_unit: str | None = None
    additional_unit: str | None = None
    images: list[InventoryImageResponse] = Field(default_factory=list)
    weight: Decimal | None = None
    neck_size: Decimal | None = None
    qty_per_box: Decimal | None = None
    box_dimension: str | None = None
    reorder_level: Decimal | None = None

    @field_serializer(
        "weight",
        "neck_size",
        "qty_per_box",
        "reorder_level",
    )
    def serialize_decimals(self, value: Decimal | None) -> float | None:
        if value is None:
            return None
        return float(value)


class InventoryMasterListResponse(BaseModel):
    """Inventory master rows for the Master > Inventory screen."""

    items: list[InventoryMasterItemResponse] = Field(default_factory=list)


class UpsertInventoryExtraRequest(BaseModel):
    """Create or update app-owned fields for a stock item."""

    stock_item: str = Field(min_length=1, max_length=255)
    weight: Decimal | None = None
    neck_size: Decimal | None = None
    qty_per_box: Decimal | None = None
    box_dimension: str | None = Field(default=None, max_length=255)
    reorder_level: Decimal | None = None

    @field_validator("stock_item")
    @classmethod
    def require_stock_item(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Stock item is required")
        return stripped

    @field_validator("box_dimension", mode="before")
    @classmethod
    def strip_box_dimension(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value
