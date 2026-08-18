"""Read-only legacy model for tallydata_stockposition."""

from __future__ import annotations

from app.db.base import LegacyBase
from sqlalchemy import BigInteger, Float, Text
from sqlalchemy.orm import Mapped, mapped_column


class TallyStockPosition(LegacyBase):
    """Closing stock position synced from Tally via tallysync."""

    __tablename__ = "tallydata_stockposition"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_item: Mapped[str | None] = mapped_column(Text)
    stock_group: Mapped[str | None] = mapped_column(Text)
    costing_method: Mapped[str | None] = mapped_column(Text)
    base_unit: Mapped[str | None] = mapped_column(Text)
    closing_qty: Mapped[float | None] = mapped_column(Float)
    closing_rate: Mapped[float | None] = mapped_column(Float)
    closing_value: Mapped[float | None] = mapped_column(Float)
