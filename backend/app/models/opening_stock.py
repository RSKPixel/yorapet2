"""Opening stock balances for inventory valuation."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

_SYNC_NUMERIC = Numeric(18, 2)


class YorapetOpeningStock(Base):
    """Opening stock line used for qty and FIFO valuation."""

    __tablename__ = "yorapet_opening_stock"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_item: Mapped[str] = mapped_column(String(255), index=True)
    opening_date: Mapped[datetime] = mapped_column(DateTime, index=True)
    qty: Mapped[Decimal] = mapped_column(_SYNC_NUMERIC)
    opening_rate: Mapped[Decimal | None] = mapped_column(_SYNC_NUMERIC, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
