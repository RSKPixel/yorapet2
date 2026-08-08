"""App-owned inventory extras keyed by stock item name."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

_NUMERIC = Numeric(18, 2)


class YorapetInventoryExtra(Base):
    """Additional stock-item fields beyond tallydata_inventorymaster."""

    __tablename__ = "yorapet_inventory_extra"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_item: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    weight: Mapped[Decimal | None] = mapped_column(_NUMERIC, nullable=True)
    neck_size: Mapped[Decimal | None] = mapped_column(_NUMERIC, nullable=True)
    qty_per_box: Mapped[Decimal | None] = mapped_column(_NUMERIC, nullable=True)
    box_dimension: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reorder_level: Mapped[Decimal | None] = mapped_column(_NUMERIC, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
