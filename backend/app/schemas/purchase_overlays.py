"""Schemas for purchase expense and credit note overlays."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PurchaseVoucherOption(BaseModel):
    voucher_no: str
    voucher_date: datetime | None = None
    vendor: str | None = None


class PurchaseVoucherListResponse(BaseModel):
    items: list[PurchaseVoucherOption]


class PurchaseStockItemOption(BaseModel):
    stock_item: str


class PurchaseStockItemListResponse(BaseModel):
    items: list[PurchaseStockItemOption]


class PurchaseExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    voucher_no: str
    voucher_date: datetime | None = None
    expenses: Decimal
    credit_note: Decimal = Decimal("0")


class PurchaseExpenseListResponse(BaseModel):
    items: list[PurchaseExpenseResponse]


class UpsertPurchaseExpenseRequest(BaseModel):
    voucher_no: str = Field(min_length=1, max_length=64)
    voucher_date: datetime | None = None
    expenses: Decimal = Field(ge=0)


class PurchaseCreditNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    voucher_no: str
    voucher_date: datetime | None = None
    stock_item: str
    credit_note: Decimal


class PurchaseCreditNoteListResponse(BaseModel):
    items: list[PurchaseCreditNoteResponse]


class UpsertPurchaseCreditNoteRequest(BaseModel):
    voucher_no: str = Field(min_length=1, max_length=64)
    voucher_date: datetime | None = None
    stock_item: str = Field(min_length=1, max_length=255)
    credit_note: Decimal = Field(ge=0)


class PurchaseCostLineCreditInput(BaseModel):
    id: int
    credit_note: Decimal = Field(ge=0)


class UpsertPurchaseCostingRequest(BaseModel):
    voucher_no: str = Field(min_length=1, max_length=64)
    voucher_date: datetime | None = None
    expenses: Decimal = Field(ge=0)
    credit_note: Decimal = Field(ge=0)
    lines: list[PurchaseCostLineCreditInput] = Field(default_factory=list)


class PurchaseCostPreviewLine(BaseModel):
    id: int
    stock_item: str
    qty: Decimal | None
    box: Decimal | None = None
    qty_per_box: Decimal | None = None
    amount: Decimal | None
    value_addition: Decimal | None = None
    credit_note: Decimal = Decimal("0")
    cost_value: Decimal
    cost_price: Decimal | None


class PurchaseCostPreviewTotals(BaseModel):
    qty: Decimal
    boxes: Decimal
    amount: Decimal
    credit_note: Decimal
    cost_value: Decimal


class PurchaseCostPreviewResponse(BaseModel):
    voucher_no: str
    voucher_date: datetime | None = None
    vendor: str | None = None
    expenses: Decimal
    credit_note: Decimal = Decimal("0")
    lines: list[PurchaseCostPreviewLine]
    totals: PurchaseCostPreviewTotals
