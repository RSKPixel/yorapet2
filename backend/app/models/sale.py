"""Application-owned sales records synced from Tally."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

_SYNC_NUMERIC = Numeric(18, 2)


class YorapetSale(Base):
    """Sales line imported from tallydata_sales."""

    __tablename__ = "yorapet_sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sync_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    voucher_no: Mapped[str | None] = mapped_column(String(64), nullable=True)
    voucher_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ledger_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    broker: Mapped[str | None] = mapped_column(String(255), nullable=True)
    item_count: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    item_no: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    stock_item: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand: Mapped[str | None] = mapped_column(Text, nullable=True)
    packing: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    qty: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    rate: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    amount: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    discount: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    cartage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
