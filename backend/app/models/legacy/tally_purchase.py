"""Read-only legacy model for tallydata_purchases."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import LegacyBase


class TallyPurchase(LegacyBase):
    """Purchase voucher lines synced from Tally via tallysync."""

    __tablename__ = "tallydata_purchases"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    voucher_no: Mapped[str | None] = mapped_column(Text)
    voucher_date: Mapped[datetime | None] = mapped_column(DateTime)
    ledger_name: Mapped[str | None] = mapped_column(Text)
    broker: Mapped[str | None] = mapped_column(Text)
    item_count: Mapped[float | None] = mapped_column(Float)
    itemno: Mapped[float | None] = mapped_column(Float)
    stock_item: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(Text)
    packing: Mapped[float | None] = mapped_column(Float)
    qty: Mapped[float | None] = mapped_column(Float)
    weight: Mapped[float | None] = mapped_column(Float)
    rate: Mapped[float | None] = mapped_column(Float)
    amount: Mapped[float | None] = mapped_column(Float)
    box: Mapped[float | None] = mapped_column(Float)
    qty_per_box: Mapped[float | None] = mapped_column(Float)
