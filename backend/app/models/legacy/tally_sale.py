"""Read-only legacy model for tallydata_sales."""

from __future__ import annotations

from datetime import datetime

from app.db.base import LegacyBase
from sqlalchemy import BigInteger, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column


class TallySale(LegacyBase):
    """Sales voucher lines synced from Tally via tallysync."""

    __tablename__ = "tallydata_sales"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    voucher_no: Mapped[str | None] = mapped_column(Text)
    voucher_date: Mapped[datetime | None] = mapped_column(DateTime)
    ledger_name: Mapped[str | None] = mapped_column(Text)
    broker: Mapped[str | None] = mapped_column(Text)
    item_count: Mapped[float | None] = mapped_column(Float)
    item_no: Mapped[float | None] = mapped_column(Float)
    stock_item: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(Text)
    packing: Mapped[float | None] = mapped_column(Float)
    qty: Mapped[float | None] = mapped_column(Float)
    rate: Mapped[float | None] = mapped_column(Float)
    amount: Mapped[float | None] = mapped_column(Float)
    discount: Mapped[float | None] = mapped_column(Float)
    cartage: Mapped[str | None] = mapped_column(Text)
