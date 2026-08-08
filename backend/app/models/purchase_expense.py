"""Voucher-level purchase expenses (app-owned)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

_NUMERIC = Numeric(18, 2)


class YorapetPurchaseExpense(Base):
    """Total additional expenses for one purchase voucher (no + date)."""

    __tablename__ = "yorapet_purchase_expense"
    __table_args__ = (
        UniqueConstraint(
            "voucher_no",
            "voucher_date",
            name="uq_yorapet_purchase_expense_voucher",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    voucher_no: Mapped[str] = mapped_column(String(64), index=True)
    voucher_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    expenses: Mapped[Decimal] = mapped_column(_NUMERIC, default=Decimal("0"))
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
