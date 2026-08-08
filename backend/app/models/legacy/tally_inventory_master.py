"""Read-only legacy model for tallydata_inventorymaster."""

from __future__ import annotations

from sqlalchemy import BigInteger, Float, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import LegacyBase


class TallyInventoryMaster(LegacyBase):
    """Inventory master synced from Tally via tallysync."""

    __tablename__ = "tallydata_inventorymaster"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_item: Mapped[str | None] = mapped_column(Text)
    packing: Mapped[float | None] = mapped_column(Float)
    stock_group: Mapped[str | None] = mapped_column(Text)
    base_unit: Mapped[str | None] = mapped_column(Text)
    additional_unit: Mapped[str | None] = mapped_column(Text)
