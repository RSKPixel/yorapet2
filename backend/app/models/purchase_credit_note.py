"""Purchase credit notes keyed by voucher + stock item (app-owned)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

_NUMERIC = Numeric(18, 2)


class YorapetPurchaseCreditNote(Base):
    """Credit note amount for one stock item on a purchase voucher."""

    __tablename__ = "yorapet_purchase_credit_note"
    __table_args__ = (
        UniqueConstraint(
            "voucher_no",
            "voucher_date",
            "stock_item",
            name="uq_yorapet_purchase_credit_note_voucher_item",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    voucher_no: Mapped[str] = mapped_column(String(64), index=True)
    voucher_date: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True
    )
    stock_item: Mapped[str] = mapped_column(String(255), index=True)
    credit_note: Mapped[Decimal] = mapped_column(_NUMERIC, default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
