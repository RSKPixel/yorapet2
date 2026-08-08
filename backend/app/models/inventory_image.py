"""Image rows for inventory extras (max 4 per stock item)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, LargeBinary, String, UniqueConstraint, func
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import Mapped, deferred, mapped_column

from app.db.base import Base

_IMAGE_BLOB = LargeBinary().with_variant(LONGBLOB(), "mysql")

MAX_INVENTORY_IMAGES = 4


class YorapetInventoryImage(Base):
    """One image for a stock item; position is 1..MAX_INVENTORY_IMAGES."""

    __tablename__ = "yorapet_inventory_image"
    __table_args__ = (
        UniqueConstraint(
            "stock_item",
            "position",
            name="uq_yorapet_inventory_image_item_position",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_item: Mapped[str] = mapped_column(String(255), index=True)
    position: Mapped[int] = mapped_column(Integer)
    image_content_type: Mapped[str] = mapped_column(String(64))
    image_data: Mapped[bytes] = deferred(mapped_column(_IMAGE_BLOB, nullable=False))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
